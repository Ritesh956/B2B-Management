import { z } from 'zod';
import api, { parseApiResponse } from './api';

export interface Vendor {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  documents: { name: string; url: string; mimetype: string; size: number }[] | null;
  performanceScore: number | null;
  createdAt: string;
}

export interface VendorPerformanceRow {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  performanceScore: number | null;
  onTimeDeliveryPct: number;
  invoiceMismatchRate: number;
  approvedPOCount: number;
  invoiceCount: number;
}

export interface VendorListResponse {
  vendors: Vendor[];
  total: number;
  page: number;
  limit: number;
}

export interface VendorPerformanceResponse {
  vendors: VendorPerformanceRow[];
}

const vendorStatusSchema = z.enum(['PENDING', 'VERIFIED', 'REJECTED']);

const vendorSchema: z.ZodType<Vendor> = z.object({
  id: z.string(),
  companyName: z.string(),
  contactName: z.string(),
  email: z.string(),
  phone: z.string(),
  status: vendorStatusSchema,
  documents: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        mimetype: z.string(),
        size: z.number(),
      })
    )
    .nullable(),
  performanceScore: z.number().nullable(),
  createdAt: z.string(),
});

const vendorPerformanceRowSchema: z.ZodType<VendorPerformanceRow> = z.object({
  id: z.string(),
  companyName: z.string(),
  contactName: z.string(),
  email: z.string(),
  phone: z.string(),
  status: vendorStatusSchema,
  performanceScore: z.number().nullable(),
  onTimeDeliveryPct: z.number(),
  invoiceMismatchRate: z.number(),
  approvedPOCount: z.number(),
  invoiceCount: z.number(),
});

const vendorListResponseSchema: z.ZodType<VendorListResponse> = z.object({
  vendors: z.array(vendorSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

const vendorPerformanceResponseSchema: z.ZodType<VendorPerformanceResponse> = z.object({
  vendors: z.array(vendorPerformanceRowSchema),
});

const singleVendorResponseSchema = z.object({ vendor: vendorSchema });

export const vendorService = {
  list: (params: { status?: string; search?: string; page?: number; limit?: number }) =>
    api
      .get('/vendors', { params })
      .then((r) => parseApiResponse(vendorListResponseSchema, r.data)),

  get: (id: string) =>
    api.get(`/vendors/${id}`).then((r) => parseApiResponse(singleVendorResponseSchema, r.data)),

  create: (formData: FormData) =>
    api
      .post('/vendors', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => parseApiResponse(singleVendorResponseSchema, r.data)),

  updateStatus: (id: string, status: 'VERIFIED' | 'REJECTED') =>
    api
      .patch(`/vendors/${id}/status`, { status })
      .then((r) => parseApiResponse(singleVendorResponseSchema, r.data)),

  listPerformance: () =>
    api
      .get('/vendors/performance')
      .then((r) => parseApiResponse(vendorPerformanceResponseSchema, r.data)),

  updatePerformanceScore: (id: string, performanceScore: number) =>
    api
      .patch(`/vendors/${id}/performance-score`, { performanceScore })
      .then((r) => parseApiResponse(singleVendorResponseSchema, r.data)),
};
