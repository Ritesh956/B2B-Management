import { Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';

type SearchResult = {
  type: 'Vendor' | 'PurchaseOrder' | 'Invoice';
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export const globalSearch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const query = String(req.query.query || req.query.q || '').trim();
    if (query.length < 2) {
      res.status(200).json({ results: [] as SearchResult[] });
      return;
    }

    const vendorsPromise = prisma.vendor.findMany({
      where: {
        OR: [
          { companyName: { contains: query, mode: 'insensitive' } },
          { contactName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { companyName: 'asc' },
      take: 5,
      select: { id: true, companyName: true, contactName: true, email: true },
    });

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
      poWhere.vendor = { ...poWhere.vendor, email: user?.email ?? '__none__' };
    }

    const invoicesWhere: any = {
      OR: [
        { invoiceNumber: { contains: query, mode: 'insensitive' } },
        { po: { poNumber: { contains: query, mode: 'insensitive' } } },
        { vendor: { companyName: { contains: query, mode: 'insensitive' } } },
      ],
    };

    if (req.user.role === Role.VENDOR) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } });
      invoicesWhere.vendor = { email: user?.email ?? '__none__' };
    } else if (req.user.role !== Role.ADMIN && req.user.role !== Role.FINANCE) {
      delete invoicesWhere.OR;
    }

    const [vendors, pos, invoices] = await Promise.all([
      vendorsPromise,
      prisma.purchaseOrder.findMany({
        where: poWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          poNumber: true,
          status: true,
          vendor: { select: { companyName: true } },
        },
      }),
      req.user.role === Role.ADMIN || req.user.role === Role.FINANCE || req.user.role === Role.VENDOR
        ? prisma.invoice.findMany({
            where: invoicesWhere,
            orderBy: { submittedAt: 'desc' },
            take: 5,
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              po: { select: { poNumber: true } },
              vendor: { select: { companyName: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const results: SearchResult[] = [
      ...vendors.map((vendor) => ({
        type: 'Vendor' as const,
        id: vendor.id,
        title: vendor.companyName,
        subtitle: `${vendor.contactName} • ${vendor.email}`,
        href: `/vendors/${vendor.id}`,
      })),
      ...pos.map((po) => ({
        type: 'PurchaseOrder' as const,
        id: po.id,
        title: po.poNumber,
        subtitle: `${po.vendor.companyName} • ${po.status}`,
        href: `/pos/${po.id}`,
      })),
      ...invoices.map((invoice) => ({
        type: 'Invoice' as const,
        id: invoice.id,
        title: invoice.invoiceNumber,
        subtitle: `${invoice.vendor.companyName} • PO ${invoice.po.poNumber} • ${invoice.status}`,
        href: `/invoices/${invoice.id}`,
      })),
    ];

    res.status(200).json({ results });
  } catch (err) {
    console.error('[globalSearch]', err);
    res.status(500).json({ error: 'Failed to search records' });
  }
};