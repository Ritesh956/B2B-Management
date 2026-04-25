import { z } from 'zod';
import api, { parseApiResponse } from './api';

export interface VendorDashboardPO {
  id: string;
  poNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
}

export interface VendorDashboardInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  amount: number;
  submittedAt: string;
  po: { poNumber: string };
}

export interface VendorDashboardContract {
  id: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface VendorProfile {
  userId: string;
  name: string;
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
}

export interface VendorDashboardResponse {
  summary: {
    poCount: number;
    submittedInvoiceCount: number;
    contractSummary: {
      total: number;
      active: number;
      expiringSoon: number;
      expired: number;
    };
  };
  pos: VendorDashboardPO[];
  approvedPOs: Array<{ id: string; poNumber: string; totalAmount: number; createdAt: string }>;
  invoices: VendorDashboardInvoice[];
  contracts: VendorDashboardContract[];
  vendor: {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    phone: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const vendorDashboardResponseSchema: z.ZodType<VendorDashboardResponse> = z.object({
  summary: z.object({
    poCount: z.number(),
    submittedInvoiceCount: z.number(),
    contractSummary: z.object({
      total: z.number(),
      active: z.number(),
      expiringSoon: z.number(),
      expired: z.number(),
    }),
  }),
  pos: z.array(
    z.object({
      id: z.string(),
      poNumber: z.string(),
      status: z.string(),
      totalAmount: z.number(),
      createdAt: z.string(),
    })
  ),
  approvedPOs: z.array(
    z.object({
      id: z.string(),
      poNumber: z.string(),
      totalAmount: z.number(),
      createdAt: z.string(),
    })
  ),
  invoices: z.array(
    z.object({
      id: z.string(),
      invoiceNumber: z.string(),
      status: z.string(),
      amount: z.number(),
      submittedAt: z.string(),
      po: z.object({ poNumber: z.string() }),
    })
  ),
  contracts: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      startDate: z.string(),
      endDate: z.string(),
    })
  ),
  vendor: z.object({
    id: z.string(),
    companyName: z.string(),
    contactName: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
});

const vendorProfileSchema: z.ZodType<VendorProfile> = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  companyName: z.string(),
  contactName: z.string(),
  phone: z.string(),
});

const vendorProfileResponseSchema = z.object({
  profile: vendorProfileSchema,
});

export const vendorPortalService = {
  getDashboard: () =>
    api.get('/vendor/dashboard').then((r) => parseApiResponse(vendorDashboardResponseSchema, r.data)),
  getProfile: () =>
    api.get('/vendor/profile').then((r) => parseApiResponse(vendorProfileResponseSchema, r.data)),
  updateProfile: (payload: { name: string; email: string; contactName: string; phone: string }) =>
    api
      .patch('/vendor/profile', payload)
      .then((r) => parseApiResponse(vendorProfileResponseSchema, r.data)),
};
