import { Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';

// Entity types ActivityFeed actually embeds on detail pages. Anything outside
// this whitelist stays ADMIN-only, same as an unscoped browse.
const SCOPED_ENTITIES = new Set(['PurchaseOrder', 'Invoice', 'Vendor']);

// For a non-admin caller asking about one specific entity+entityId (the
// ActivityFeed case, never the broad-browse Audit Logs page), work out which
// vendor email owns that record — or null if it's not a vendor-owned entity
// check at all (staff roles don't need one).
const getOwningVendorEmail = async (entity: string, entityId: string): Promise<string | null> => {
  if (entity === 'Vendor') {
    const vendor = await prisma.vendor.findUnique({ where: { id: entityId }, select: { email: true } });
    return vendor?.email ?? null;
  }
  if (entity === 'PurchaseOrder') {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: entityId }, select: { vendor: { select: { email: true } } } });
    return po?.vendor.email ?? null;
  }
  if (entity === 'Invoice') {
    const invoice = await prisma.invoice.findUnique({ where: { id: entityId }, select: { vendor: { select: { email: true } } } });
    return invoice?.vendor.email ?? null;
  }
  return null;
};

export const listAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const {
      page = '1',
      limit = '20',
      entity,
      entityId,
      userId,
      from,
      to,
      search,
    } = req.query as Record<string, string>;

    if (req.user.role !== Role.ADMIN) {
      // Non-admins may only ask about one specific, owned entity (what the
      // embedded ActivityFeed widget does) — never the unscoped admin browse.
      if (!entity || !entityId || !SCOPED_ENTITIES.has(entity)) {
        res.status(403).json({ error: 'Not authorized to browse audit logs' });
        return;
      }

      if (req.user.role === Role.VENDOR) {
        const [requester, owningEmail] = await Promise.all([
          prisma.user.findUnique({ where: { id: req.user.id }, select: { email: true } }),
          getOwningVendorEmail(entity, entityId),
        ]);

        if (!owningEmail || requester?.email !== owningEmail) {
          res.status(404).json({ error: 'Not found' });
          return;
        }
      }
      // FINANCE/PROCUREMENT/MANAGER already have unrestricted view access to
      // PurchaseOrder/Invoice/Vendor detail pages elsewhere in the app, so no
      // further ownership check is needed for those roles.
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (entity) {
      where.entity = entity;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999Z`);
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.status(200).json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('[listAuditLogs]', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};
