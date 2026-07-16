import { Request, Response } from 'express';
import { prisma } from '../config/prisma';

export const getDeletedItems = async (_req: Request, res: Response): Promise<void> => {
  try {
    // We must query the raw tables or use a prisma extension to bypass the middleware,
    // since the middleware hides deleted items.
    // The easiest way to bypass Prisma middleware is to temporarily set a flag, or just use queryRaw.
    // Since we want all deleted items grouped:
    
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

export const restoreItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, type } = req.body;
    if (!id || !type) {
      res.status(400).json({ error: 'id and type are required' });
      return;
    }

    // Use $executeRaw to bypass middleware and restore
    if (type === 'User') {
      await prisma.$executeRaw`UPDATE "User" SET "deletedAt" = NULL WHERE id = ${id}`;
    } else if (type === 'Vendor') {
      await prisma.$executeRaw`UPDATE "Vendor" SET "deletedAt" = NULL WHERE id = ${id}`;
    } else if (type === 'PurchaseOrder') {
      await prisma.$executeRaw`UPDATE "PurchaseOrder" SET "deletedAt" = NULL WHERE id = ${id}`;
    } else if (type === 'Invoice') {
      await prisma.$executeRaw`UPDATE "Invoice" SET "deletedAt" = NULL WHERE id = ${id}`;
    } else if (type === 'Contract') {
      await prisma.$executeRaw`UPDATE "Contract" SET "deletedAt" = NULL WHERE id = ${id}`;
    } else {
      res.status(400).json({ error: 'Invalid type' });
      return;
    }

    res.status(200).json({ message: 'Item restored successfully' });
  } catch (err) {
    console.error('[restoreItem]', err);
    res.status(500).json({ error: 'Failed to restore item' });
  }
};

export const deleteItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, type } = req.body; // or take from path, but query/body is simpler for generic
    if (!id || !type) {
      res.status(400).json({ error: 'id and type are required' });
      return;
    }

    const now = new Date();
    
    // Use regular prisma update so it goes through middleware?
    // Actually middleware doesn't block updates typically, but if we do raw it's safe.
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
    } else {
      res.status(400).json({ error: 'Invalid type' });
      return;
    }

    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (err) {
    console.error('[deleteItem]', err);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};
