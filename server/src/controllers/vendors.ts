import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';
import { InvoiceStatus, POStatus, VendorStatus } from '@prisma/client';
import { buildLocalFileUrl } from '../config/s3';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

const getApprovalDate = (approvalChain: unknown, fallbackDate: Date): Date => {
  if (!approvalChain || typeof approvalChain !== 'object') {
    return fallbackDate;
  }

  const steps = Array.isArray((approvalChain as any).steps) ? (approvalChain as any).steps : [];
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const approvedAt = steps[index]?.approvedAt;
    if (approvedAt) {
      const parsed = new Date(approvedAt);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  return fallbackDate;
};

const roundPercent = (value: number): number => Math.round(value);

export const createVendor = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { companyName, contactName, email, phone } = req.body as {
      companyName: string; contactName: string; email: string; phone: string;
    };
    if (!companyName || !contactName || !email || !phone) {
      res.status(400).json({ error: 'companyName, contactName, email, and phone are required' });
      return;
    }
    const files = (req.files as Express.Multer.File[]) ?? [];
    const documents = files.map((f) => ({
      name: f.originalname,
      url: buildLocalFileUrl(f.path),
      key: f.filename,
      mimetype: f.mimetype,
      size: f.size,
    }));
    const vendor = await prisma.vendor.create({
      data: { companyName, contactName, email, phone, documents },
    });

    await prisma.auditLog.create({
      // Cast vendor.id to string to fix "string | string[]" error
      data: { userId: req.user?.id ?? null, action: 'CREATE', entity: 'Vendor', entityId: vendor.id as string, metadata: { companyName, email } },
    });
    res.status(201).json({ vendor });
  } catch (err) {
    console.error('[createVendor]', err);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
};

export const listVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const where: any = {}; // Use any here to allow dynamic construction of the Prisma where object

    if (status && Object.values(VendorStatus).includes(status as VendorStatus)) {
      where['status'] = status as VendorStatus;
    }
    if (search) {
      where['OR'] = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({ where, skip, take: limitNum, orderBy: { createdAt: 'desc' } }),
      prisma.vendor.count({ where }),
    ]);
    res.status(200).json({ vendors, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error('[listVendors]', err);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
};

export const getVendorPerformance = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { companyName: 'asc' },
      select: {
        id: true,
        companyName: true,
        contactName: true,
        email: true,
        phone: true,
        status: true,
        performanceScore: true,
        purchaseOrders: {
          select: {
            status: true,
            createdAt: true,
            approvalChain: true,
            invoices: {
              select: {
                submittedAt: true,
                status: true,
              },
              orderBy: { submittedAt: 'asc' },
            },
          },
        },
        invoices: {
          select: {
            status: true,
          },
        },
      },
    });

    const performance = vendors.map((vendor) => {
      const approvedPOs = vendor.purchaseOrders.filter((po) => po.status === POStatus.APPROVED || po.status === POStatus.CLOSED);
      const onTimePOs = approvedPOs.filter((po) => {
        const approvalDate = getApprovalDate(po.approvalChain, po.createdAt);
        const firstInvoice = po.invoices[0];
        if (!firstInvoice?.submittedAt) return false;
        const submittedAt = new Date(firstInvoice.submittedAt);
        return submittedAt.getTime() <= approvalDate.getTime() + (7 * DAY_IN_MS);
      });

      const totalInvoices = vendor.invoices.length;
      const mismatchCount = vendor.invoices.filter((invoice) => invoice.status === InvoiceStatus.MISMATCHED).length;

      return {
        id: vendor.id,
        companyName: vendor.companyName,
        contactName: vendor.contactName,
        email: vendor.email,
        phone: vendor.phone,
        status: vendor.status,
        performanceScore: vendor.performanceScore,
        onTimeDeliveryPct: roundPercent(approvedPOs.length ? (onTimePOs.length / approvedPOs.length) * 100 : 0),
        invoiceMismatchRate: roundPercent(totalInvoices ? (mismatchCount / totalInvoices) * 100 : 0),
        approvedPOCount: approvedPOs.length,
        invoiceCount: totalInvoices,
      };
    });

    res.status(200).json({ vendors: performance });
  } catch (err) {
    console.error('[getVendorPerformance]', err);
    res.status(500).json({ error: 'Failed to fetch vendor performance' });
  }
};

export const updateVendorPerformanceScore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params;
    const { performanceScore } = req.body as { performanceScore?: number };

    if (typeof performanceScore !== 'number' || Number.isNaN(performanceScore) || performanceScore < 0 || performanceScore > 100) {
      res.status(400).json({ error: 'performanceScore must be a number between 0 and 100' });
      return;
    }

    const vendorId = id as string;
    const existing = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!existing) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: { performanceScore },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_SCORE',
        entity: 'Vendor',
        entityId: vendor.id,
        metadata: { from: existing.performanceScore, to: performanceScore },
      },
    });

    res.status(200).json({ vendor });
  } catch (err) {
    console.error('[updateVendorPerformanceScore]', err);
    res.status(500).json({ error: 'Failed to update vendor performance score' });
  }
};

export const getVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const vendor = await prisma.vendor.findUnique({
      // Cast id to string to ensure it's not string[]
      where: { id: id as string },
      include: { contracts: true, purchaseOrders: { take: 5, orderBy: { createdAt: 'desc' } } },
    });
    if (!vendor) { res.status(404).json({ error: 'Vendor not found' }); return; }
    res.status(200).json({ vendor });
  } catch (err) {
    console.error('[getVendor]', err);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
};

export const updateVendorStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: VendorStatus };

    // Explicitly check for allowed statuses to satisfy the literal type requirement
    if (status !== VendorStatus.VERIFIED && status !== VendorStatus.REJECTED) {
      res.status(400).json({ error: 'status must be VERIFIED or REJECTED' });
      return;
    }

    const existing = await prisma.vendor.findUnique({
      where: { id: id as string }
    });

    if (!existing) { res.status(404).json({ error: 'Vendor not found' }); return; }

    const vendor = await prisma.vendor.update({
      where: { id: id as string },
      data: { status }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'STATUS_CHANGE',
        entity: 'Vendor',
        entityId: id as string,
        metadata: { from: existing.status, to: status }
      },
    });
    res.status(200).json({ vendor });
  } catch (err) {
    console.error('[updateVendorStatus]', err);
    res.status(500).json({ error: 'Failed to update vendor status' });
  }
};