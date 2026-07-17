import { Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';

export const globalSearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const query = String(req.query.q || req.query.query || '').trim();
    if (query.length < 2) {
      res.status(200).json({
        vendors: [],
        purchaseOrders: [],
        invoices: [],
        contracts: [],
      });
      return;
    }

    // Vendors don't get a directory of other vendors — same reasoning as
    // GET /api/v1/vendors being staff-only.
    const showVendors = req.user.role !== Role.VENDOR;
    const vendorsPromise = showVendors
      ? prisma.vendor.findMany({
          where: {
            OR: [
              { companyName: { contains: query, mode: 'insensitive' } },
              { contactName: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
          orderBy: { companyName: 'asc' },
          take: 3,
          select: { id: true, companyName: true, status: true },
        })
      : Promise.resolve([]);

    const poWhere: any = {
      OR: [
        { poNumber: { contains: query, mode: 'insensitive' } },
        { vendor: { companyName: { contains: query, mode: 'insensitive' } } },
      ],
    };

    if (req.user.role === Role.PROCUREMENT) {
      poWhere.createdById = req.user.id;
    }
    if (req.user.role === Role.VENDOR) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
      poWhere.vendor = { email: user?.email ?? '__none__' };
    }

    const posPromise = prisma.purchaseOrder.findMany({
      where: poWhere,
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, poNumber: true, status: true },
    });

    const invoicesWhere: any = {
      OR: [
        { invoiceNumber: { contains: query, mode: 'insensitive' } },
        { vendor: { companyName: { contains: query, mode: 'insensitive' } } },
      ],
    };

    if (req.user.role === Role.VENDOR) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
      invoicesWhere.vendor = { email: user?.email ?? '__none__' };
    }

    const showInvoices = req.user.role === Role.ADMIN || req.user.role === Role.FINANCE || req.user.role === Role.VENDOR;
    const invoicesPromise = showInvoices
      ? prisma.invoice.findMany({
          where: invoicesWhere,
          orderBy: { submittedAt: 'desc' },
          take: 3,
          select: { id: true, invoiceNumber: true, status: true },
        })
      : Promise.resolve([]);

    const contractsWhere: any = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { vendor: { companyName: { contains: query, mode: 'insensitive' } } },
      ],
    };

    const showContracts = req.user.role !== Role.VENDOR;
    const contractsPromise = showContracts
      ? prisma.contract.findMany({
          where: contractsWhere,
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: { id: true, title: true, status: true },
        })
      : Promise.resolve([]);

    const [vendors, purchaseOrders, invoices, contracts] = await Promise.all([
      vendorsPromise,
      posPromise,
      invoicesPromise,
      contractsPromise,
    ]);

    res.status(200).json({
      vendors,
      purchaseOrders,
      invoices,
      contracts,
    });
  } catch (err) {
    console.error('[globalSearch]', err);
    res.status(500).json({ error: 'Failed to search records' });
  }
};