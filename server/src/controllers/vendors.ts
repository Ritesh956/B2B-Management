import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';
import { InvoiceStatus, VendorStatus } from '@prisma/client';
import { buildLocalFileUrl } from '../config/s3';
import { stringify } from 'csv-stringify/sync';

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
  } catch (err: any) {
    console.error('[createVendor]', err);
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A vendor with this email already exists.' });
      return;
    }
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
        performanceScore: true,
        purchaseOrders: {
          select: {
            status: true,
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
      const totalPOs = vendor.purchaseOrders.length;
      const totalInvoices = vendor.invoices.length;
      const mismatchedInvoices = vendor.invoices.filter((invoice) => invoice.status === InvoiceStatus.MISMATCHED).length;

      return {
        id: vendor.id,
        name: vendor.companyName,
        companyName: vendor.companyName,
        performanceScore: vendor.performanceScore,
        totalPOs,
        totalInvoices,
        mismatchedInvoices,
        mismatchRate: roundPercent(totalInvoices ? (mismatchedInvoices / totalInvoices) * 100 : 0),
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

export const bulkUpdateVendors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only admins can bulk update vendors' });
      return;
    }
    const { ids, action } = req.body as { ids: string[]; action: 'verify' | 'reject' };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids array is required' });
      return;
    }
    if (action !== 'verify' && action !== 'reject') {
      res.status(400).json({ error: 'action must be verify or reject' });
      return;
    }
    const status = action === 'verify' ? VendorStatus.VERIFIED : VendorStatus.REJECTED;
    await prisma.vendor.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: `BULK_${action.toUpperCase()}`,
        entity: 'Vendor',
        entityId: 'bulk',
        metadata: { ids, status },
      },
    });
    res.status(200).json({ updated: ids.length, status });
  } catch (err) {
    console.error('[bulkUpdateVendors]', err);
    res.status(500).json({ error: 'Failed to bulk update vendors' });
  }
};

export const bulkExportVendors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids array is required' });
      return;
    }
    const vendors = await prisma.vendor.findMany({
      where: { id: { in: ids } },
      orderBy: { companyName: 'asc' },
    });
    const csvData = stringify(
      vendors.map((v) => [
        v.companyName,
        v.contactName,
        v.email,
        v.phone,
        v.status,
        v.performanceScore ?? '',
      ]),
      { header: true, columns: ['Company', 'Contact', 'Email', 'Phone', 'Status', 'Score'] }
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="selected-vendors.csv"');
    res.send(csvData);
  } catch (err) {
    console.error('[bulkExportVendors]', err);
    res.status(500).json({ error: 'Failed to export selected vendors' });
  }
};

export const exportVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query as Record<string, string>;
    const where: any = {};
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
    const vendors = await prisma.vendor.findMany({ where, orderBy: { createdAt: 'desc' } });

    const csvData = stringify(
      vendors.map((v) => [
        v.companyName,
        v.contactName,
        v.email,
        v.phone,
        v.status,
        v.performanceScore ?? '',
      ]),
      { header: true, columns: ['Company', 'Contact', 'Email', 'Phone', 'Status', 'Score'] }
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="vendors.csv"');
    res.send(csvData);
  } catch (err) {
    console.error('[exportVendors]', err);
    res.status(500).json({ error: 'Failed to export vendors' });
  }
};