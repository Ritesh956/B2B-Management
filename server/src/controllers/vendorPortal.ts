import { Response } from 'express';
import { ContractStatus, POStatus, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';

const getVendorForUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user || user.role !== Role.VENDOR) {
    return { user: null, vendor: null };
  }

  const vendor = await prisma.vendor.findUnique({
    where: { email: user.email },
  });

  return { user, vendor };
};

export const getVendorDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { user, vendor } = await getVendorForUser(req.user.id);

    if (!user || !vendor) {
      res.status(404).json({ error: 'Vendor profile not found for this user' });
      return;
    }

    const now = new Date();
    const thirtyDays = new Date(now);
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const [
      poCount,
      submittedInvoiceCount,
      totalContracts,
      activeContracts,
      expiringSoonContracts,
      expiredContracts,
      pos,
      invoices,
      contracts,
      approvedPOs,
    ] = await Promise.all([
      prisma.purchaseOrder.count({ where: { vendorId: vendor.id } }),
      prisma.invoice.count({ where: { vendorId: vendor.id } }),
      prisma.contract.count({ where: { vendorId: vendor.id } }),
      prisma.contract.count({
        where: {
          vendorId: vendor.id,
          status: ContractStatus.ACTIVE,
          endDate: { gte: now },
        },
      }),
      prisma.contract.count({
        where: {
          vendorId: vendor.id,
          status: ContractStatus.ACTIVE,
          endDate: { gte: now, lte: thirtyDays },
        },
      }),
      prisma.contract.count({
        where: {
          vendorId: vendor.id,
          OR: [{ endDate: { lt: now } }, { status: ContractStatus.EXPIRED }],
        },
      }),
      prisma.purchaseOrder.findMany({
        where: { vendorId: vendor.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          poNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
      }),
      prisma.invoice.findMany({
        where: { vendorId: vendor.id },
        orderBy: { submittedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          amount: true,
          submittedAt: true,
          po: { select: { poNumber: true } },
        },
      }),
      prisma.contract.findMany({
        where: { vendorId: vendor.id },
        orderBy: { endDate: 'asc' },
        take: 10,
        select: {
          id: true,
          title: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      }),
      prisma.purchaseOrder.findMany({
        where: { vendorId: vendor.id, status: POStatus.APPROVED },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          poNumber: true,
          totalAmount: true,
          createdAt: true,
        },
      }),
    ]);

    const contractSummary = {
      total: totalContracts,
      active: activeContracts,
      expiringSoon: expiringSoonContracts,
      expired: expiredContracts,
    };

    res.status(200).json({
      summary: {
        poCount,
        submittedInvoiceCount,
        contractSummary,
      },
      pos,
      invoices,
      contracts,
      approvedPOs,
      vendor: {
        id: vendor.id,
        companyName: vendor.companyName,
        contactName: vendor.contactName,
        email: vendor.email,
        phone: vendor.phone,
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[getVendorDashboard]', err);
    res.status(500).json({ error: 'Failed to fetch vendor dashboard' });
  }
};

export const getVendorProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { user, vendor } = await getVendorForUser(req.user.id);

    if (!user || !vendor) {
      res.status(404).json({ error: 'Vendor profile not found for this user' });
      return;
    }

    res.status(200).json({
      profile: {
        userId: user.id,
        name: user.name,
        email: user.email,
        companyName: vendor.companyName,
        contactName: vendor.contactName,
        phone: vendor.phone,
      },
    });
  } catch (err) {
    console.error('[getVendorProfile]', err);
    res.status(500).json({ error: 'Failed to fetch vendor profile' });
  }
};

export const updateVendorProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { user, vendor } = await getVendorForUser(req.user.id);
    if (!user || !vendor) {
      res.status(404).json({ error: 'Vendor profile not found for this user' });
      return;
    }

    const { name, email, contactName, phone } = req.body as {
      name?: string;
      email?: string;
      contactName?: string;
      phone?: string;
    };

    const nextName = name?.trim() || user.name;
    const nextEmail = email?.trim() || user.email;
    const nextContactName = contactName?.trim() || vendor.contactName;
    const nextPhone = phone?.trim() || vendor.phone;

    if (!nextName || !nextEmail || !nextContactName || !nextPhone) {
      res.status(400).json({ error: 'name, email, contactName and phone are required' });
      return;
    }

    if (nextEmail !== user.email) {
      const [existingUser, existingVendor] = await Promise.all([
        prisma.user.findUnique({ where: { email: nextEmail } }),
        prisma.vendor.findUnique({ where: { email: nextEmail } }),
      ]);

      if (existingUser && existingUser.id !== user.id) {
        res.status(409).json({ error: 'Email already in use by another user' });
        return;
      }

      if (existingVendor && existingVendor.id !== vendor.id) {
        res.status(409).json({ error: 'Email already in use by another vendor' });
        return;
      }
    }

    const [updatedUser, updatedVendor] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          name: nextName,
          email: nextEmail,
        },
        select: { id: true, name: true, email: true },
      }),
      prisma.vendor.update({
        where: { id: vendor.id },
        data: {
          contactName: nextContactName,
          email: nextEmail,
          phone: nextPhone,
        },
        select: {
          id: true,
          companyName: true,
          contactName: true,
          email: true,
          phone: true,
        },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_PROFILE',
        entity: 'VendorProfile',
        entityId: updatedVendor.id,
        metadata: {
          from: {
            name: user.name,
            email: user.email,
            contactName: vendor.contactName,
            phone: vendor.phone,
          },
          to: {
            name: nextName,
            email: nextEmail,
            contactName: nextContactName,
            phone: nextPhone,
          },
        },
      },
    });

    res.status(200).json({
      profile: {
        userId: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        companyName: updatedVendor.companyName,
        contactName: updatedVendor.contactName,
        phone: updatedVendor.phone,
      },
    });
  } catch (err) {
    console.error('[updateVendorProfile]', err);
    res.status(500).json({ error: 'Failed to update vendor profile' });
  }
};
