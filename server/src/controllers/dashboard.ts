import { Response } from 'express';
import { AuditLog, InvoiceStatus, POStatus, Role, VendorStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';

type MonthPoint = {
  month: string;
  poVolume: number;
  totalSpend: number;
};

type VendorSpendPoint = {
  vendorId: string;
  vendorName: string;
  totalSpend: number;
  poCount: number;
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

const getApprovedPOStatusFilter = () => ({
  status: { in: [POStatus.APPROVED, POStatus.CLOSED] },
});

const buildMonthSeries = (monthBuckets: { start: Date; end: Date; key: string }[], purchaseOrders: { createdAt: Date; totalAmount: number }[]): MonthPoint[] => {
  const monthSeries: MonthPoint[] = monthBuckets.map((bucket) => ({
    month: bucket.key,
    poVolume: 0,
    totalSpend: 0,
  }));

  purchaseOrders.forEach((po) => {
    const idx = monthBuckets.findIndex((bucket) => po.createdAt >= bucket.start && po.createdAt < bucket.end);
    if (idx >= 0) {
      monthSeries[idx].poVolume += 1;
      monthSeries[idx].totalSpend = Number((monthSeries[idx].totalSpend + po.totalAmount).toFixed(2));
    }
  });

  return monthSeries;
};

const loadTopVendorsByPOValue = async (): Promise<VendorSpendPoint[]> => {
  const topVendorSpendRaw = await prisma.purchaseOrder.groupBy({
    by: ['vendorId'],
    where: getApprovedPOStatusFilter(),
    _sum: { totalAmount: true },
    _count: { _all: true },
    orderBy: { _sum: { totalAmount: 'desc' } },
    take: 5,
  });

  const topVendorIds = topVendorSpendRaw.map((row) => row.vendorId);
  const vendors = topVendorIds.length
    ? await prisma.vendor.findMany({
        where: { id: { in: topVendorIds } },
        select: { id: true, companyName: true },
      })
    : [];
  const vendorNameById = new Map(vendors.map((vendor) => [vendor.id, vendor.companyName]));

  return topVendorSpendRaw.map((row) => ({
    vendorId: row.vendorId,
    vendorName: vendorNameById.get(row.vendorId) ?? 'Unknown Vendor',
    totalSpend: Number((row._sum.totalAmount ?? 0).toFixed(2)),
    poCount: row._count._all,
  }));
};

const loadOldestPendingPO = async () => {
  const oldestPending = await prisma.purchaseOrder.findFirst({
    where: { status: POStatus.PENDING_APPROVAL },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      poNumber: true,
      createdAt: true,
      vendor: {
        select: { companyName: true },
      },
    },
  });

  return oldestPending
    ? {
        id: oldestPending.id,
        poNumber: oldestPending.poNumber,
        vendorName: oldestPending.vendor.companyName,
        createdAt: oldestPending.createdAt,
        daysWaiting: Math.max(0, Math.floor((Date.now() - oldestPending.createdAt.getTime()) / (1000 * 60 * 60 * 24))),
      }
    : null;
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
    ]);
    const [topVendorsByPOValue, oldestPendingPO, spendByMonthPOs] = await Promise.all([
      loadTopVendorsByPOValue(),
      loadOldestPendingPO(),
      prisma.purchaseOrder.findMany({
        where: {
          createdAt: { gte: oldestMonthStart },
          ...getApprovedPOStatusFilter(),
        },
        select: { createdAt: true, totalAmount: true },
      }),
    ]);

    const monthSeries = buildMonthSeries(monthBuckets, recentPOs);
    const spendSeries = buildMonthSeries(monthBuckets, spendByMonthPOs);

    const invoiceStatusBreakdown = (invoiceStatusRaw as any[]).map((row) => ({
      status: row.status,
      count: row._count.status,
    }));

    res.status(200).json({
      stats: {
        totalActiveVendors,
        posPendingMyApproval,
        invoicesPendingReview,
        contractsExpiringThisMonth,
        spendByMonth: spendSeries.map((point) => ({ month: point.month, value: point.totalSpend })),
      },
      charts: {
        poVolumeByMonth: monthSeries.map((p) => ({ month: p.month, value: p.poVolume })),
        poSpendByMonth: spendSeries.map((p) => ({ month: p.month, value: p.totalSpend })),
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

export const getTopVendors = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vendors = await loadTopVendorsByPOValue();
    res.status(200).json({ vendors });
  } catch (err) {
    console.error('[getTopVendors]', err);
    res.status(500).json({ error: 'Failed to fetch top vendors' });
  }
};

export const getOldestPendingPO = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const oldestPendingPO = await loadOldestPendingPO();
    res.status(200).json({ oldestPendingPO });
  } catch (err) {
    console.error('[getOldestPendingPO]', err);
    res.status(500).json({ error: 'Failed to fetch oldest pending PO' });
  }
};
