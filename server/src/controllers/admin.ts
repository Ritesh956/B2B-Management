import { Response } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';

const DELETABLE_TYPES = ['User', 'Vendor', 'PurchaseOrder', 'Invoice', 'Contract'] as const;
type DeletableType = typeof DELETABLE_TYPES[number];

const isDeletableType = (type: unknown): type is DeletableType =>
  typeof type === 'string' && (DELETABLE_TYPES as readonly string[]).includes(type);

export const getDeletedItems = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Raw queries bypass the soft-delete Prisma extension, which hides
    // deleted rows from every normal find*.
    const [users, vendors, pos, invoices, contracts] = await Promise.all([
      prisma.$queryRaw`SELECT id, name, email, 'User' as type, "deletedAt" FROM "User" WHERE "deletedAt" IS NOT NULL`,
      prisma.$queryRaw`SELECT id, "companyName" as name, email, 'Vendor' as type, "deletedAt" FROM "Vendor" WHERE "deletedAt" IS NOT NULL`,
      prisma.$queryRaw`SELECT id, "poNumber" as name, "status", 'PurchaseOrder' as type, "deletedAt" FROM "PurchaseOrder" WHERE "deletedAt" IS NOT NULL`,
      prisma.$queryRaw`SELECT id, "invoiceNumber" as name, "status", 'Invoice' as type, "deletedAt" FROM "Invoice" WHERE "deletedAt" IS NOT NULL`,
      prisma.$queryRaw`SELECT id, title as name, "status", 'Contract' as type, "deletedAt" FROM "Contract" WHERE "deletedAt" IS NOT NULL`,
    ]);

    res.status(200).json({
      items: [
        ...(users as any[]),
        ...(vendors as any[]),
        ...(pos as any[]),
        ...(invoices as any[]),
        ...(contracts as any[]),
      ],
    });
  } catch (err) {
    console.error('[getDeletedItems]', err);
    res.status(500).json({ error: 'Failed to fetch deleted items' });
  }
};

export const restoreItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, type } = req.body as { id?: string; type?: string };
    if (!id || !type || !isDeletableType(type)) {
      res.status(400).json({ error: 'A valid id and type are required' });
      return;
    }

    // $executeRaw returns the affected-row count — 0 means the id doesn't
    // exist (or was never deleted), which used to fall through as a silent
    // "success".
    let affected = 0;
    if (type === 'User') {
      affected = await prisma.$executeRaw`UPDATE "User" SET "deletedAt" = NULL WHERE id = ${id} AND "deletedAt" IS NOT NULL`;
    } else if (type === 'Vendor') {
      affected = await prisma.$executeRaw`UPDATE "Vendor" SET "deletedAt" = NULL WHERE id = ${id} AND "deletedAt" IS NOT NULL`;
    } else if (type === 'PurchaseOrder') {
      affected = await prisma.$executeRaw`UPDATE "PurchaseOrder" SET "deletedAt" = NULL WHERE id = ${id} AND "deletedAt" IS NOT NULL`;
    } else if (type === 'Invoice') {
      affected = await prisma.$executeRaw`UPDATE "Invoice" SET "deletedAt" = NULL WHERE id = ${id} AND "deletedAt" IS NOT NULL`;
    } else if (type === 'Contract') {
      affected = await prisma.$executeRaw`UPDATE "Contract" SET "deletedAt" = NULL WHERE id = ${id} AND "deletedAt" IS NOT NULL`;
    }

    if (affected === 0) {
      res.status(404).json({ error: 'No deleted item found with that id' });
      return;
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'RESTORE',
        entity: type,
        entityId: id,
      },
    });

    res.status(200).json({ message: 'Item restored successfully' });
  } catch (err) {
    console.error('[restoreItem]', err);
    res.status(500).json({ error: 'Failed to restore item' });
  }
};

export const deleteItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, type } = req.body as { id?: string; type?: string };
    if (!id || !type || !isDeletableType(type)) {
      res.status(400).json({ error: 'A valid id and type are required' });
      return;
    }

    const now = new Date();

    if (type === 'User') {
      // Deleting yourself, or the only active admin, permanently locks the
      // org out of this very admin panel.
      if (id === req.user?.id) {
        res.status(400).json({ error: 'You cannot delete your own account' });
        return;
      }
      const target = await prisma.user.findUnique({ where: { id }, select: { role: true, isActive: true } });
      if (!target) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      if (target.role === Role.ADMIN && target.isActive) {
        const otherAdmins = await prisma.user.count({
          where: { role: Role.ADMIN, isActive: true, id: { not: id } },
        });
        if (otherAdmins === 0) {
          res.status(400).json({ error: 'Cannot delete the last active admin' });
          return;
        }
      }
    }

    try {
      if (type === 'User') {
        await prisma.user.update({ where: { id }, data: { deletedAt: now } });
      } else if (type === 'Vendor') {
        await prisma.vendor.update({ where: { id }, data: { deletedAt: now } });
      } else if (type === 'PurchaseOrder') {
        await prisma.purchaseOrder.update({ where: { id }, data: { deletedAt: now } });
      } else if (type === 'Invoice') {
        await prisma.invoice.update({ where: { id }, data: { deletedAt: now } });
      } else if (type === 'Contract') {
        await prisma.contract.update({ where: { id }, data: { deletedAt: now } });
      }
    } catch (err: any) {
      // P2025 = no row with that id — a 404, not a 500.
      if (err?.code === 'P2025') {
        res.status(404).json({ error: 'Item not found' });
        return;
      }
      throw err;
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'SOFT_DELETE',
        entity: type,
        entityId: id,
      },
    });

    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('[deleteItem]', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};
