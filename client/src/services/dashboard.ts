import { z } from 'zod';
import api, { parseApiResponse } from './api';

export interface DashboardStats {
  totalActiveVendors: number;
  posPendingMyApproval: number;
  invoicesPendingReview: number;
  contractsExpiringThisMonth: number;
  spendByMonth: ChartPoint[];
}

export interface ChartPoint {
  month: string;
  value: number;
}

export interface InvoiceStatusPoint {
  status: string;
  count: number;
}

export interface RecentActivityItem {
  id: string;
  timestamp: string;
  user: { id: string; name: string; email: string; role: string } | null;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
}

export interface TopVendorByPOValueItem {
  vendorId: string;
  vendorName: string;
  totalSpend: number;
  poCount: number;
}

export interface OldestPendingPOItem {
  id: string;
  poNumber: string;
  vendorName: string;
  createdAt: string;
  daysWaiting: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  charts: {
    poVolumeByMonth: ChartPoint[];
    poSpendByMonth: ChartPoint[];
    invoiceStatusBreakdown: InvoiceStatusPoint[];
  };
  topVendorsByPOValue: TopVendorByPOValueItem[];
  oldestPendingPO: OldestPendingPOItem | null;
  recentActivity: RecentActivityItem[];
}

const chartPointSchema: z.ZodType<ChartPoint> = z.object({
  month: z.string(),
  value: z.number(),
});

const invoiceStatusPointSchema: z.ZodType<InvoiceStatusPoint> = z.object({
  status: z.string(),
  count: z.number(),
});

const recentActivitySchema: z.ZodType<RecentActivityItem> = z.object({
  id: z.string(),
  timestamp: z.string(),
  user: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string(),
    })
    .nullable(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
});

const dashboardResponseSchema: z.ZodType<DashboardResponse> = z.object({
  stats: z.object({
    totalActiveVendors: z.number(),
    posPendingMyApproval: z.number(),
    invoicesPendingReview: z.number(),
    contractsExpiringThisMonth: z.number(),
    spendByMonth: z.array(chartPointSchema),
  }),
  charts: z.object({
    poVolumeByMonth: z.array(chartPointSchema),
    poSpendByMonth: z.array(chartPointSchema),
    invoiceStatusBreakdown: z.array(invoiceStatusPointSchema),
  }),
  topVendorsByPOValue: z.array(
    z.object({
      vendorId: z.string(),
      vendorName: z.string(),
      totalSpend: z.number(),
      poCount: z.number(),
    })
  ),
  oldestPendingPO: z
    .object({
      id: z.string(),
      poNumber: z.string(),
      vendorName: z.string(),
      createdAt: z.string(),
      daysWaiting: z.number(),
    })
    .nullable(),
  recentActivity: z.array(recentActivitySchema),
});

export const dashboardService = {
  getStats: () =>
    api.get('/dashboard/stats').then((r) => parseApiResponse(dashboardResponseSchema, r.data)),

  getTopVendors: () =>
    api
      .get('/dashboard/top-vendors')
      .then((r) => parseApiResponse(z.object({ vendors: z.array(z.object({
        vendorId: z.string(),
        vendorName: z.string(),
        totalSpend: z.number(),
        poCount: z.number(),
      })) }), r.data)),

  getOldestPendingPO: () =>
    api
      .get('/dashboard/oldest-pending')
      .then((r) => parseApiResponse(z.object({
        oldestPendingPO: z
          .object({
            id: z.string(),
            poNumber: z.string(),
            vendorName: z.string(),
            createdAt: z.string(),
            daysWaiting: z.number(),
          })
          .nullable(),
      }), r.data)),
};
