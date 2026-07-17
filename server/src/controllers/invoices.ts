import { Response } from 'express';
import { InvoiceStatus, POStatus, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';
import { enqueueEmail } from '../queues';
import { buildLocalFileUrl } from '../config/s3';
import { stringify } from 'csv-stringify/sync';
import { notifyUser } from '../utils/notify';
import { csvSafe } from '../utils/csvSafe';
import { retryOnUniqueConflict } from '../utils/retryOnUniqueConflict';

const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Raw query bypasses the soft-delete extension — a soft-deleted invoice
  // still holds its invoiceNumber in the unique index, so computing "next"
  // only from live rows would keep proposing an already-used number.
  const rows = await prisma.$queryRaw<{ invoiceNumber: string }[]>`
    SELECT "invoiceNumber" FROM "Invoice"
    WHERE "invoiceNumber" LIKE ${prefix + '%'}
    ORDER BY "invoiceNumber" DESC
    LIMIT 1
  `;

  const lastSequence = rows[0]?.invoiceNumber ? parseInt(rows[0].invoiceNumber.split('-')[2] || '0', 10) : 0;
  const nextSequence = Number.isNaN(lastSequence) ? 1 : lastSequence + 1;

  return `${prefix}${String(nextSequence).padStart(4, '0')}`;
};

const mapInvoice = (invoice: any) => {
  const poTotal = invoice.po?.totalAmount ?? 0;
  const amountDiff = Number((invoice.amount - poTotal).toFixed(2));
  return {
    ...invoice,
    amountDiff,
  };
};

export const submitInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { poId, amount } = req.body as { poId: string; amount: string | number };
    const file = req.file as Express.Multer.File | undefined;

    if (!poId || amount === undefined || amount === null) {
      res.status(400).json({ error: 'poId and amount are required' });
      return;
    }

    if (!file) {
      res.status(400).json({ error: 'Invoice PDF is required' });
      return;
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: 'amount must be a positive number' });
      return;
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { vendor: true },
    });

    if (!po) {
      res.status(404).json({ error: 'Purchase order not found' });
      return;
    }

    if (po.status !== POStatus.APPROVED) {
      res.status(400).json({ error: 'Invoice can be submitted only against an approved PO' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true, role: true },
    });

    if (!user || user.role !== Role.VENDOR) {
      res.status(403).json({ error: 'Only vendors can submit invoices' });
      return;
    }

    if (user.email !== po.vendor.email) {
      res.status(403).json({ error: 'You can submit invoices only for your own vendor purchase orders' });
      return;
    }

    const status = numericAmount === po.totalAmount ? InvoiceStatus.MATCHED : InvoiceStatus.MISMATCHED;

    const invoice = await retryOnUniqueConflict(
      async () => {
        const invoiceNumber = await generateInvoiceNumber();
        return prisma.invoice.create({
          data: {
            invoiceNumber,
            poId: po.id,
            vendorId: po.vendorId,
            amount: numericAmount,
            status,
            fileUrl: buildLocalFileUrl(file.path),
          },
          include: {
            po: {
              select: {
                id: true,
                poNumber: true,
                totalAmount: true,
                status: true,
                createdAt: true,
              },
            },
            vendor: {
              select: {
                id: true,
                companyName: true,
                email: true,
              },
            },
          },
        });
      },
      'invoiceNumber'
    );

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'SUBMIT',
        entity: 'Invoice',
        entityId: invoice.id,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          poId: po.id,
          amount: numericAmount,
          status,
        },
      },
    });

    const financeUsers = await prisma.user.findMany({
      where: { role: Role.FINANCE },
      select: { id: true, email: true },
    });

    if (financeUsers.length > 0) {
      await Promise.allSettled([
        enqueueEmail({
          to: financeUsers.map((u) => u.email).join(','),
          subject: `Invoice ${invoice.invoiceNumber} ${status.toLowerCase()}`,
          html: `<p>Invoice <strong>${invoice.invoiceNumber}</strong> for PO <strong>${invoice.po.poNumber}</strong> was submitted and marked as <strong>${status}</strong>.</p>`,
        }),
        ...financeUsers.map((financeUser) =>
          notifyUser(financeUser.id, `Invoice ${invoice.invoiceNumber} is ${status}`, 'INFO')
        ),
      ]);
    }

    res.status(201).json({ invoice: mapInvoice(invoice) });
  } catch (err) {
    console.error('[submitInvoice]', err);
    res.status(500).json({ error: 'Failed to submit invoice' });
  }
};

export const listInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const where: import('@prisma/client').Prisma.InvoiceWhereInput = {};

    if (req.user.role === Role.VENDOR) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
      where.vendor = { email: user?.email ?? '__none__' };
    }

    if (req.user.role !== Role.VENDOR && req.user.role !== Role.FINANCE && req.user.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Only vendors, finance and admin can view invoices' });
      return;
    }

    const { status: statusFilter, vendorId, minAmount, maxAmount, fromDate, toDate, page = '1', limit = '10' } = req.query as Record<string, string>;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Support comma-separated multiple statuses
    if (statusFilter) {
      const statuses = statusFilter.split(',').filter(s => Object.values(InvoiceStatus).includes(s as InvoiceStatus)) as InvoiceStatus[];
      if (statuses.length === 1) where.status = statuses[0];
      else if (statuses.length > 1) where.status = { in: statuses };
    }
    if (vendorId) where.vendorId = vendorId;
    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = parseFloat(minAmount);
      if (maxAmount) where.amount.lte = parseFloat(maxAmount);
    }
    if (fromDate || toDate) {
      where.submittedAt = {};
      if (fromDate) where.submittedAt.gte = new Date(fromDate);
      if (toDate) where.submittedAt.lte = new Date(toDate);
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limitNumber,
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    }),
    prisma.invoice.count({ where }),
  ]);

    res.status(200).json({ invoices: invoices.map(mapInvoice), total, page: pageNumber, limit: limitNumber });
  } catch (err) {
    console.error('[listInvoices]', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

export const getInvoiceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const id = req.params.id as string;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            items: true,
          },
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (req.user.role === Role.VENDOR) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
      if (!user || user.email !== invoice.vendor.email) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    } else if (req.user.role !== Role.FINANCE && req.user.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Only vendors, finance and admin can view invoice details' });
      return;
    }

    res.status(200).json({ invoice: mapInvoice(invoice) });
  } catch (err) {
    console.error('[getInvoiceById]', err);
    res.status(500).json({ error: 'Failed to fetch invoice detail' });
  }
};

export const approveInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.FINANCE) {
      res.status(403).json({ error: 'Only finance can approve invoices' });
      return;
    }

    const id = req.params.id as string;
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            items: true,
          },
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (existing.status !== InvoiceStatus.MATCHED && existing.status !== InvoiceStatus.MISMATCHED) {
      res.status(400).json({ error: 'Only matched or mismatched invoices can be approved' });
      return;
    }

    const reason = req.body.reason;
    if (existing.status === InvoiceStatus.MISMATCHED) {
      if (req.user.role !== Role.FINANCE && req.user.role !== Role.ADMIN) {
        res.status(403).json({ error: 'Only finance or admin can force-approve a mismatched invoice' });
        return;
      }
      if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        res.status(400).json({ error: 'A reason is required to force-approve a mismatched invoice' });
        return;
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.APPROVED },
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            items: true,
          },
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'APPROVE',
        entity: 'Invoice',
        entityId: invoice.id,
        metadata: { invoiceNumber: invoice.invoiceNumber, forceApproved: existing.status === InvoiceStatus.MISMATCHED, reason },
      },
    });

    res.status(200).json({ invoice: mapInvoice(invoice) });
  } catch (err) {
    console.error('[approveInvoice]', err);
    res.status(500).json({ error: 'Failed to approve invoice' });
  }
};

export const payInvoice = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.FINANCE) {
      res.status(403).json({ error: 'Only finance can mark invoice as paid' });
      return;
    }

    const id = req.params.id as string;
    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            items: true,
          },
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    if (existing.status !== InvoiceStatus.APPROVED) {
      res.status(400).json({ error: 'Only approved invoices can be marked as paid' });
      return;
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.PAID },
      include: {
        po: {
          select: {
            id: true,
            poNumber: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            items: true,
          },
        },
        vendor: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PAY',
        entity: 'Invoice',
        entityId: invoice.id,
        metadata: { invoiceNumber: invoice.invoiceNumber },
      },
    });

    const vendorUser = await prisma.user.findFirst({
      where: {
        role: Role.VENDOR,
        email: invoice.vendor.email,
      },
      select: { id: true },
    });

    if (vendorUser) {
      await Promise.allSettled([
        notifyUser(vendorUser.id, `Invoice ${invoice.invoiceNumber} has been marked as PAID`, 'INFO'),
        enqueueEmail({
          to: invoice.vendor.email,
          subject: `Invoice ${invoice.invoiceNumber} paid`,
          html: `<p>Your invoice <strong>${invoice.invoiceNumber}</strong> has been marked as PAID.</p>`,
        }),
      ]);
    }

    res.status(200).json({ invoice: mapInvoice(invoice) });
  } catch (err) {
    console.error('[payInvoice]', err);
    res.status(500).json({ error: 'Failed to mark invoice as paid' });
  }
};

export const exportInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const where: import('@prisma/client').Prisma.InvoiceWhereInput = {};

    if (req.user.role === Role.VENDOR) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
      where.vendor = { email: user?.email ?? '__none__' };
    }

    if (req.user.role !== Role.VENDOR && req.user.role !== Role.FINANCE && req.user.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Only vendors, finance and admin can view invoices' });
      return;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        po: { select: { poNumber: true } },
        vendor: { select: { companyName: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });

    const csvData = stringify(
      invoices.map((inv) => [
        inv.invoiceNumber,
        inv.po.poNumber,
        csvSafe(inv.vendor.companyName),
        inv.amount,
        inv.status,
        new Date(inv.submittedAt).toLocaleDateString('en-IN'),
      ]),
      { header: true, columns: ['Invoice #', 'PO #', 'Vendor', 'Amount', 'Status', 'Submitted'] }
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"');
    res.send(csvData);
  } catch (err) {
    console.error('[exportInvoices]', err);
    res.status(500).json({ error: 'Failed to export invoices' });
  }
};

export const bulkApproveInvoices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.FINANCE) {
      res.status(403).json({ error: 'Only finance can bulk approve invoices' });
      return;
    }
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids array is required' });
      return;
    }

    // Only MATCHED invoices are eligible for a bulk (non-force) approval -
    // find out up front which selected ids won't be touched, and why, so the
    // caller isn't left guessing why "updated" is lower than the selection.
    const requested = await prisma.invoice.findMany({
      where: { id: { in: ids } },
      select: { id: true, invoiceNumber: true, status: true },
    });
    const foundIds = new Set(requested.map((inv) => inv.id));
    const skipped = [
      ...requested
        .filter((inv) => inv.status !== InvoiceStatus.MATCHED)
        .map((inv) => ({ id: inv.id, invoiceNumber: inv.invoiceNumber, reason: `status is ${inv.status}, not MATCHED` })),
      ...ids
        .filter((id) => !foundIds.has(id))
        .map((id) => ({ id, invoiceNumber: null, reason: 'not found' })),
    ];

    const result = await prisma.invoice.updateMany({
      where: { id: { in: ids }, status: InvoiceStatus.MATCHED },
      data: { status: InvoiceStatus.APPROVED },
    });
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'BULK_APPROVE',
        entity: 'Invoice',
        entityId: 'bulk',
        metadata: { ids, updated: result.count, skipped },
      },
    });
    res.status(200).json({ updated: result.count, skipped });
  } catch (err) {
    console.error('[bulkApproveInvoices]', err);
    res.status(500).json({ error: 'Failed to bulk approve invoices' });
  }
};

