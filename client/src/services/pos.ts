import { z } from 'zod';
import api, { parseApiResponse } from './api';

export type POStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CLOSED';

export interface POLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface POApprovalStep {
  step: number;
  role: 'MANAGER' | 'FINANCE' | 'ADMIN';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedById: string | null;
  approvedAt: string | null;
  isCurrent: boolean;
  overriddenBy?: { userId: string; reason: string } | null;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  createdById: string;
  status: POStatus;
  items: POLineItem[];
  totalAmount: number;
  currentApproverIndex: number;
  createdAt: string;
  vendor: { id: string; companyName: string; email: string };
  createdBy: { id: string; name: string; email: string; role: string };
  approvalSteps: POApprovalStep[];
  currentApproverRole: string | null;
  rejectionReason: string | null;
  rejectedAt?: string | null;
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    status: 'SUBMITTED' | 'MATCHED' | 'MISMATCHED' | 'APPROVED' | 'PAID';
    submittedAt: string;
    amount: number;
    paidAt?: string | null;
  }>;
}

export interface POListResponse {
  pos: PurchaseOrder[];
  total: number;
  page: number;
  limit: number;
  pendingCount: number;
  approvedCount: number;
}

const poStatusSchema = z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CLOSED']);

const poSchema: z.ZodType<PurchaseOrder> = z.object({
  id: z.string(),
  poNumber: z.string(),
  vendorId: z.string(),
  createdById: z.string(),
  status: poStatusSchema,
  items: z.array(
    z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      lineTotal: z.number(),
    })
  ),
  totalAmount: z.number(),
  currentApproverIndex: z.number(),
  createdAt: z.string(),
  vendor: z.object({ id: z.string(), companyName: z.string(), email: z.string() }),
  createdBy: z.object({ id: z.string(), name: z.string(), email: z.string(), role: z.string() }),
  approvalSteps: z.array(
    z.object({
      step: z.number(),
      role: z.enum(['MANAGER', 'FINANCE', 'ADMIN']),
      status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
      approvedById: z.string().nullable(),
      approvedAt: z.string().nullable(),
      isCurrent: z.boolean(),
      overriddenBy: z.object({ userId: z.string(), reason: z.string() }).nullable().optional(),
    })
  ),
  currentApproverRole: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  rejectedAt: z.string().nullable().optional(),
  invoices: z
    .array(
      z.object({
        id: z.string(),
        invoiceNumber: z.string(),
        status: z.enum(['SUBMITTED', 'MATCHED', 'MISMATCHED', 'APPROVED', 'PAID']),
        submittedAt: z.string(),
        amount: z.number(),
        paidAt: z.string().nullable().optional(),
      })
    )
    .optional(),
});

const poListResponseSchema: z.ZodType<POListResponse> = z.object({
  pos: z.array(poSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  pendingCount: z.number(),
  approvedCount: z.number(),
});

const singlePoResponseSchema = z.object({ po: poSchema });

export const poService = {
  list: (params?: { status?: POStatus | '' | string; vendorId?: string; minAmount?: string; maxAmount?: string; fromDate?: string; toDate?: string; createdById?: string; page?: number; limit?: number }) =>
    api.get('/pos', { params }).then((r) => parseApiResponse(poListResponseSchema, r.data)),

  get: (id: string) =>
    api.get(`/pos/${id}`).then((r) => parseApiResponse(singlePoResponseSchema, r.data)),

  create: (payload: { vendorId: string; items: Array<{ description: string; quantity: number; unitPrice: number }> }) =>
    api.post('/pos', payload).then((r) => parseApiResponse(singlePoResponseSchema, r.data)),

  approve: (id: string, reason?: string) =>
    api.post(`/pos/${id}/approve`, reason ? { reason } : {}).then((r) => parseApiResponse(singlePoResponseSchema, r.data)),

  reject: (id: string, reason: string) =>
    api.post(`/pos/${id}/reject`, { reason }).then((r) => parseApiResponse(singlePoResponseSchema, r.data)),
};
