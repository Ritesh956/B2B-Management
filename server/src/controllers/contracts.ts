import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';
import { ContractStatus } from '@prisma/client';
import { buildLocalFileUrl } from '../config/s3';

export const createContract = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { vendorId, title, startDate, endDate } = req.body as {
      vendorId: string; title: string; startDate: string; endDate: string;
    };

    if (!vendorId || !title || !startDate || !endDate) {
      res.status(400).json({ error: 'vendorId, title, startDate, and endDate are required' });
      return;
    }

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    const file = (req.file as Express.Multer.File) || null;
    const fileUrl = file ? buildLocalFileUrl(file.path) : null;

    const contract = await prisma.contract.create({
      data: {
        vendorId,
        title,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        fileUrl,
        status: ContractStatus.ACTIVE,
      },
      include: {
        vendor: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'CREATE',
        entity: 'Contract',
        entityId: contract.id,
        metadata: { vendorId, title, fileUrl },
      },
    });

    res.status(201).json({ contract });
  } catch (err) {
    console.error('[createContract]', err);
    res.status(500).json({ error: 'Failed to create contract' });
  }
};

export const listContracts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, searchVendor, expiringSoon, filter, page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;
    const now = new Date();
    const thirtyDays = new Date(now);
    thirtyDays.setDate(thirtyDays.getDate() + 30);

    const where: any = {};

    if (status && Object.values(ContractStatus).includes(status as ContractStatus)) {
      where.status = status as ContractStatus;
    }

    if (searchVendor) {
      where.vendor = {
        OR: [
          { companyName: { contains: searchVendor, mode: 'insensitive' } },
          { email: { contains: searchVendor, mode: 'insensitive' } },
        ],
      };
    }

    if (filter === 'expiring' || expiringSoon === 'true' || expiringSoon === '1') {
      where.status = ContractStatus.ACTIVE;
      where.endDate = { gte: now, lte: thirtyDays };
    } else if (filter === 'expired') {
      where.endDate = { lt: now };
    } else if (filter === 'active') {
      where.status = ContractStatus.ACTIVE;
      where.endDate = { gte: now };
    }

    const orderBy = (filter === 'expiring' || expiringSoon === 'true' || expiringSoon === '1')
      ? { endDate: 'asc' as const }
      : { createdAt: 'desc' as const };

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        vendor: true,
      },
      orderBy,
      skip,
      take: limitNum,
    });

    const totalCount = await prisma.contract.count({ where });

    // Add calculated daysUntilExpiry field
    const contractsWithExpiry = contracts.map((contract) => {
      const now = new Date();
      const daysUntilExpiry = Math.ceil((contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...contract,
        daysUntilExpiry,
        isExpired: daysUntilExpiry < 0,
        isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= 30,
      };
    });

    res.status(200).json({
      contracts: contractsWithExpiry,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (err) {
    console.error('[listContracts]', err);
    res.status(500).json({ error: 'Failed to list contracts' });
  }
};

export const getContractById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        vendor: true,
      },
    });

    if (!contract) {
      res.status(404).json({ error: 'Contract not found' });
      return;
    }

    const now = new Date();
    const daysUntilExpiry = Math.ceil((contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    res.status(200).json({
      contract: {
        ...contract,
        daysUntilExpiry,
        isExpired: daysUntilExpiry < 0,
        isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= 30,
      },
    });
  } catch (err) {
    console.error('[getContractById]', err);
    res.status(500).json({ error: 'Failed to fetch contract' });
  }
};

export const updateContractStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { status } = req.body as { status: string };

    if (!status || !Object.values(ContractStatus).includes(status as ContractStatus)) {
      res.status(400).json({ error: 'Invalid status value' });
      return;
    }

    const contract = await prisma.contract.findUnique({ where: { id } });
    if (!contract) {
      res.status(404).json({ error: 'Contract not found' });
      return;
    }

    const updatedContract = await prisma.contract.update({
      where: { id },
      data: { status: status as ContractStatus },
      include: {
        vendor: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user?.id ?? null,
        action: 'UPDATE_STATUS',
        entity: 'Contract',
        entityId: id,
        metadata: { oldStatus: contract.status, newStatus: status },
      },
    });

    const now = new Date();
    const daysUntilExpiry = Math.ceil((updatedContract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    res.status(200).json({
      contract: {
        ...updatedContract,
        daysUntilExpiry,
        isExpired: daysUntilExpiry < 0,
        isExpiringSoon: daysUntilExpiry >= 0 && daysUntilExpiry <= 30,
      },
    });
  } catch (err) {
    console.error('[updateContractStatus]', err);
    res.status(500).json({ error: 'Failed to update contract' });
  }
};
