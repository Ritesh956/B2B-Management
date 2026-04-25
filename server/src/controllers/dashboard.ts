import { Response } from 'express';
import { AuditLog, InvoiceStatus, POStatus, Role, VendorStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';

type MonthPoint = {
  month: string;
  poVolume: number;
  totalSpend: number;
};

const monthLabel = (date: Date): string =>
  date.toLocaleString('en-US', { month: 'short', year: '2-digit' });

const getLastSixMonthBuckets = () => {
  const buckets: { start: Date; end: Date; key: string }[] = [];
  const now = new Date();

  for (let i = 5; i >= 0; i -= 1) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    buckets.push({ start, end, key: monthLabel(start) });
  }

  return buckets;
};

const getPOPendingMyApproval = async (userId: string, role: Role): Promise<number> => {
  if (role !== Role.ADMIN && role !== Role.FINANCE && role !== Role.MANAGER) {
    return 0;
  }

  const pendingPOs = await prisma.purchaseOrder.findMany({
    where: { status: POStatus.PENDING_APPROVAL },
    select: {
      approvalChain: true,
      currentApproverIndex: true,
    },
  });

  return pendingPOs.filter((po) => {
    const chain = po.approvalChain as any;
    const steps = Array.isArray(chain?.steps) ? chain.steps : [];
    const current = steps[po.currentApproverIndex];
    return current?.role === role;
  }).length;
};

const getInvoicePendingReview = async (userId: string, role: Role): Promise<number> => {
  if (role === Role.FINANCE) {
    return prisma.invoice.count({
      where: {
        status: { in: [InvoiceStatus.MATCHED, InvoiceStatus.MISMATCHED, InvoiceStatus.SUBMITTED] },
      },
    });
  }

  if (role === Role.VENDOR) {
    const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (!currentUser?.email) return 0;

    return prisma.invoice.count({
      where: {
        vendor: { email: currentUser.email },
        status: { in: [InvoiceStatus.SUBMITTED, InvoiceStatus.MATCHED, InvoiceStatus.MISMATCHED] },
      },
    });
  }

  return 0;
};

const mapRecentActivity = (logs: (AuditLog & { user: { id: string; name: string; email: string; role: Role } | null })[]) =>
  logs.map((log) => ({
    id: log.id,
    timestamp: log.createdAt,
    user: log.user ? { id: log.user.id, name: log.user.name, email: log.user.email, role: log.user.role } : null,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    metadata: log.metadata,
  }));

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthBuckets = getLastSixMonthBuckets();
    const oldestMonthStart = monthBuckets[0].start;

    const [
      totalActiveVendors,
      posPendingMyApproval,
      invoicesPendingReview,
      contractsExpiringThisMonth,
      recentPOs,
      invoiceStatusRaw,
      recentActivityRaw,
      topVendorSpendRaw,
      oldestPendingPORaw,
    ] = await Promise.all([
      prisma.vendor.count({ where: { status: VendorStatus.VERIFIED } }),
      getPOPendingMyApproval(req.user.id, req.user.role),
      getInvoicePendingReview(req.user.id, req.user.role),
      prisma.contract.count({
        where: {
          endDate: { gte: monthStart, lt: nextMonthStart },
        },
      }),
      prisma.purchaseOrder.findMany({
        where: { createdAt: { gte: oldestMonthStart } },
        select: { createdAt: true, totalAmount: true },
      }),
      prisma.invoice.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.purchaseOrder.groupBy({
        by: ['vendorId'],
        where: {
          createdAt: { gte: oldestMonthStart },
          status: { in: [POStatus.PENDING_APPROVAL, POStatus.APPROVED, POStatus.CLOSED] },
        },
        _sum: { totalAmount: true },
        _count: { _all: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
      prisma.purchaseOrder.findFirst({
        where: { status: POStatus.PENDING_APPROVAL },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          poNumber: true,
          createdAt: true,
        },
      }),
    ]);

    const topVendorIds = topVendorSpendRaw.map((row) => row.vendorId);
    const vendors = topVendorIds.length
      ? await prisma.vendor.findMany({
          where: { id: { in: topVendorIds } },
          select: { id: true, companyName: true },
        })
      : [];
    const vendorNameById = new Map(vendors.map((v) => [v.id, v.companyName]));

    const monthSeries: MonthPoint[] = monthBuckets.map((bucket) => ({
      month: bucket.key,
      poVolume: 0,
      totalSpend: 0,
    }));

    recentPOs.forEach((po) => {
      const idx = monthBuckets.findIndex((b) => po.createdAt >= b.start && po.createdAt < b.end);
      if (idx >= 0) {
        monthSeries[idx].poVolume += 1;
        monthSeries[idx].totalSpend = Number((monthSeries[idx].totalSpend + po.totalAmount).toFixed(2));
      }
    });

    const invoiceStatusBreakdown = (invoiceStatusRaw as any[]).map((row) => ({
      status: row.status,
      count: row._count.status,
    }));

    const topVendorsByPOValue = topVendorSpendRaw.map((row) => ({
      vendorId: row.vendorId,
      vendorName: vendorNameById.get(row.vendorId) ?? 'Unknown Vendor',
      totalSpend: Number((row._sum.totalAmount ?? 0).toFixed(2)),
      poCount: row._count._all,
    }));

    const oldestPendingPO = oldestPendingPORaw
      ? {
          id: oldestPendingPORaw.id,
          poNumber: oldestPendingPORaw.poNumber,
          createdAt: oldestPendingPORaw.createdAt,
          daysWaiting: Math.max(0, Math.floor((Date.now() - oldestPendingPORaw.createdAt.getTime()) / (1000 * 60 * 60 * 24))),
        }
      : null;

    res.status(200).json({
      stats: {
        totalActiveVendors,
        posPendingMyApproval,
        invoicesPendingReview,
        contractsExpiringThisMonth,
      },
      charts: {
        poVolumeByMonth: monthSeries.map((p) => ({ month: p.month, value: p.poVolume })),
        poSpendByMonth: monthSeries.map((p) => ({ month: p.month, value: p.totalSpend })),
        invoiceStatusBreakdown,
      },
      topVendorsByPOValue,
      oldestPendingPO,
      recentActivity: mapRecentActivity(recentActivityRaw as any),
    });
  } catch (err) {
    console.error('[getDashboardStats]', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
