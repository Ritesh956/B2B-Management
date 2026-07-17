import { Response } from 'express';
import { POStatus, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';
import {
  APPROVAL_STEP_STATUS,
  createApprovalChain,
  getCurrentApproverRole,
  isCurrentApprover,
  approveState,
  rejectState,
  toApprovalProgress,
} from '../services/approvalService';
import { enqueueEmail } from '../queues';
import { generatePO } from '../services/poPdf';
import { stringify } from 'csv-stringify/sync';
import { notifyUser } from '../utils/notify';
import { csvSafe } from '../utils/csvSafe';

const { PENDING, APPROVED, REJECTED } = APPROVAL_STEP_STATUS;

type LineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number;
};

const normalizeApprovalChain = (value: unknown) => {
  if (value && typeof value === 'object' && Array.isArray((value as any).steps)) {
    return value as any;
  }
  return { steps: [], rejectedReason: null, rejectedById: null, rejectedByRole: null, rejectedAt: null };
};

const mapPO = (po: any) => {
  const chain = normalizeApprovalChain(po.approvalChain);
  const isPending = po.status === POStatus.PENDING_APPROVAL;
  return {
    ...po,
    approvalSteps: toApprovalProgress(chain, po.currentApproverIndex, po.status),
    currentApproverRole: isPending ? getCurrentApproverRole(chain, po.currentApproverIndex) : null,
    rejectionReason: chain.rejectedReason ?? null,
  };
};

const generatePONumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  // Raw query bypasses the soft-delete extension (which only wraps
  // findMany/findFirst/findUnique), since a soft-deleted PO still holds its
  // poNumber in the unique index — computing "next" only from live rows
  // would keep proposing an already-used number and collide on create.
  const rows = await prisma.$queryRaw<{ poNumber: string }[]>`
    SELECT "poNumber" FROM "PurchaseOrder"
    WHERE "poNumber" LIKE ${prefix + '%'}
    ORDER BY "poNumber" DESC
    LIMIT 1
  `;

  const lastSequence = rows[0]?.poNumber ? parseInt(rows[0].poNumber.split('-')[2] || '0', 10) : 0;
  const nextSequence = Number.isNaN(lastSequence) ? 1 : lastSequence + 1;
  return `${prefix}${String(nextSequence).padStart(4, '0')}`;
};

const buildItemsAndTotal = (items: LineItemInput[]) => {
  const normalized = items.map((item) => {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    const lineTotal = Number((quantity * unitPrice).toFixed(2));

    return {
      description: String(item.description || '').trim(),
      quantity,
      unitPrice,
      lineTotal,
    };
  });

  const invalid = normalized.some(
    (item) => !item.description || Number.isNaN(item.quantity) || item.quantity <= 0 || Number.isNaN(item.unitPrice) || item.unitPrice <= 0
  );

  if (invalid) {
    throw new Error('Each line item must have description, quantity > 0 and unitPrice > 0');
  }

  const totalAmount = Number(normalized.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
  return { items: normalized, totalAmount };
};

export const createPO = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { vendorId, items } = req.body as { vendorId: string; items: LineItemInput[] };

    if (!vendorId || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'vendorId and at least one item are required' });
      return;
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    const { items: normalizedItems, totalAmount } = buildItemsAndTotal(items);
    const approvalChain = createApprovalChain(totalAmount);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: await generatePONumber(),
        vendorId,
        createdById: req.user.id,
        status: POStatus.PENDING_APPROVAL,
        items: normalizedItems as any,
        totalAmount,
        approvalChain: approvalChain as any,
        currentApproverIndex: 0,
      },
      include: {
        vendor: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE',
        entity: 'PurchaseOrder',
        entityId: po.id,
        metadata: { poNumber: po.poNumber, totalAmount, vendorId },
      },
    });

    res.status(201).json({ po: mapPO(po) });
  } catch (err: any) {
    console.error('[createPO]', err);
    const msg = err?.message || 'Failed to create purchase order';
    res.status(500).json({ error: msg });
  }
};

export const listPOs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { status, vendorId, minAmount, maxAmount, fromDate, toDate, createdById } = req.query as Record<string, string>;
    const where: import('@prisma/client').Prisma.PurchaseOrderWhereInput = {};

    // Support comma-separated multiple statuses
    if (status) {
      const statuses = status.split(',').filter(s => Object.values(POStatus).includes(s as POStatus)) as POStatus[];
      if (statuses.length === 1) where.status = statuses[0];
      else if (statuses.length > 1) where.status = { in: statuses };
    }
    if (vendorId) where.vendorId = vendorId;
    if (minAmount || maxAmount) {
      where.totalAmount = {};
      if (minAmount) where.totalAmount.gte = parseFloat(minAmount);
      if (maxAmount) where.totalAmount.lte = parseFloat(maxAmount);
    }
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }
    if (createdById) where.createdById = createdById;

    if (req.user.role === Role.PROCUREMENT) {
      where.createdById = req.user.id;
    }

    if (req.user.role === Role.VENDOR) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
      where.vendor = { email: user?.email ?? '__none__' };
    }

    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: { select: { id: true, companyName: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mapped = pos.map(mapPO);
    res.status(200).json({ pos: mapped, total: mapped.length });
  } catch (err) {
    console.error('[listPOs]', err);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
};

export const getPOById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const id = req.params.id as string;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            submittedAt: true,
            amount: true,
          },
          orderBy: { submittedAt: 'desc' },
        },
      },
    });

    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    if (req.user.role === Role.PROCUREMENT && po.createdById !== req.user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (req.user.role === Role.VENDOR) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
      if (!user || user.email !== po.vendor.email) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    const invoicesWithPaidDate = await Promise.all(
      po.invoices.map(async (invoice) => {
        let paidAt: Date | null = null;
        if (invoice.status === 'PAID') {
          const log = await prisma.auditLog.findFirst({
            where: {
              entity: 'Invoice',
              entityId: invoice.id,
              action: 'PAY',
            },
            select: { createdAt: true },
          });
          paidAt = log?.createdAt ?? null;
        }
        return {
          ...invoice,
          paidAt,
        };
      })
    );

    const mappedPo = {
      ...mapPO(po),
      invoices: invoicesWithPaidDate,
      rejectedAt: normalizeApprovalChain(po.approvalChain).rejectedAt ?? null,
    };

    res.status(200).json({ po: mappedPo });
  } catch (err) {
    console.error('[getPOById]', err);
    res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
};

export const getPOPdf = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const id = req.params.id as string;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        createdBy: { select: { id: true, email: true } },
      },
    });

    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    if (req.user.role === Role.PROCUREMENT && po.createdById !== req.user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (req.user.role === Role.VENDOR) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
      if (!user || user.email !== po.vendor.email) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    const pdfBuffer = await generatePO(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${po.poNumber}.pdf"`);
    res.status(200).send(pdfBuffer);
  } catch (err: any) {
    console.error('[getPOPdf]', err);
    if (err?.message === 'PO_NOT_FOUND') {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to generate PO PDF' });
  }
};

export const approvePO = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const id = req.params.id as string;
    const { reason } = (req.body || {}) as { reason?: string };

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (!existing) {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    const chain = normalizeApprovalChain(existing.approvalChain);

    const next = approveState({
      approvalChain: chain,
      currentApproverIndex: existing.currentApproverIndex,
      status: existing.status,
      actorRole: req.user.role,
      actorUserId: req.user.id,
      reason,
    });

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        approvalChain: next.approvalChain as any,
        currentApproverIndex: next.currentApproverIndex,
        status: next.status as POStatus,
      },
      include: {
        vendor: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'APPROVE',
        entity: 'PurchaseOrder',
        entityId: po.id,
        metadata: {
          poNumber: po.poNumber,
          nextStatus: po.status,
          ...(next.isOverride ? { overriddenRole: next.overriddenRole, overrideReason: reason?.trim() } : {}),
        },
      },
    });

    if (next.completed) {
      const vendorUser = await prisma.user.findFirst({
        where: {
          role: Role.VENDOR,
          email: po.vendor.email,
        },
        select: { id: true },
      });

      const recipients = Array.from(new Set([po.createdBy.email, po.vendor.email].filter(Boolean)));

      const queueTasks: Promise<unknown>[] = [];
      queueTasks.push(
        notifyUser(po.createdById, `PO ${po.poNumber} approved successfully`, 'INFO')
      );
      if (vendorUser?.id) {
        queueTasks.push(
          notifyUser(vendorUser.id, `PO ${po.poNumber} has been approved`, 'INFO')
        );
      }

      if (recipients.length > 0) {
        queueTasks.push(
          enqueueEmail({
            to: recipients.join(','),
            subject: `PO ${po.poNumber} approved`,
            html: `<p>Purchase order <strong>${po.poNumber}</strong> has been approved.</p>`,
          })
        );
      }

      await Promise.allSettled(queueTasks);
    }

    res.status(200).json({ po: mapPO(po) });
  } catch (err: any) {
    console.error('[approvePO]', err);
    const msg = err?.message || 'Failed to approve purchase order';
    res.status(400).json({ error: msg });
  }
};

export const rejectPO = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const id = req.params.id as string;
    const { reason } = req.body as { reason: string };

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendor: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (!existing) {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    const chain = normalizeApprovalChain(existing.approvalChain);
    const next = rejectState({
      approvalChain: chain,
      currentApproverIndex: existing.currentApproverIndex,
      status: existing.status,
      actorRole: req.user.role,
      actorUserId: req.user.id,
      reason,
    });

    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        approvalChain: next.approvalChain as any,
        status: next.status as POStatus,
      },
      include: {
        vendor: true,
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'REJECT',
        entity: 'PurchaseOrder',
        entityId: po.id,
        metadata: {
          poNumber: po.poNumber,
          reason: reason?.trim() || null,
          ...(next.isOverride ? { overriddenRole: next.overriddenRole } : {}),
        },
      },
    });

    await Promise.allSettled([
      notifyUser(po.createdById, `PO ${po.poNumber} was rejected${reason?.trim() ? `: ${reason.trim()}` : ''}`, 'INFO'),
      enqueueEmail({
        to: po.createdBy.email,
        subject: `PO ${po.poNumber} rejected`,
        html: `<p>Purchase order <strong>${po.poNumber}</strong> was rejected.</p>${
          reason?.trim() ? `<p>Reason: ${reason.trim()}</p>` : ''
        }`,
      }),
    ]);

    res.status(200).json({ po: mapPO(po) });
  } catch (err: any) {
    console.error('[rejectPO]', err);
    const msg = err?.message || 'Failed to reject purchase order';
    res.status(400).json({ error: msg });
  }
};

export const exportPOs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { status } = req.query as { status?: string };
    const where: import('@prisma/client').Prisma.PurchaseOrderWhereInput = {};

    if (status && Object.values(POStatus).includes(status as POStatus)) {
      where.status = status as POStatus;
    }

    if (req.user.role === Role.PROCUREMENT) {
      where.createdById = req.user.id;
    }

    if (req.user.role === Role.VENDOR) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
      where.vendor = { email: user?.email ?? '__none__' };
    }

    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: { select: { companyName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    const mapped = pos.map(mapPO);

    const csvData = stringify(
      mapped.map((po) => [
        po.poNumber,
        csvSafe(po.vendor.companyName),
        po.totalAmount,
        po.status,
        po.currentApproverRole ?? '',
        new Date(po.createdAt).toLocaleDateString('en-IN'),
      ]),
      { header: true, columns: ['PO Number', 'Vendor', 'Total', 'Status', 'Current Approver', 'Created'] }
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="purchase-orders.csv"');
    res.send(csvData);
  } catch (err) {
    console.error('[exportPOs]', err);
    res.status(500).json({ error: 'Failed to export purchase orders' });
  }
};

