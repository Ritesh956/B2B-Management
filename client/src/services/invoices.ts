import { z } from 'zod';
import api, { parseApiResponse } from './api';

export type InvoiceStatus = 'SUBMITTED' | 'MATCHED' | 'MISMATCHED' | 'APPROVED' | 'PAID';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  poId: string;
  vendorId: string;
  amount: number;
  status: InvoiceStatus;
  fileUrl: string | null;
  submittedAt: string;
  amountDiff: number;
  po: {
    id: string;
    poNumber: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    items?: unknown;
  };
  vendor: {
    id: string;
    companyName: string;
    email: string;
  };
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
}

const invoiceStatusSchema = z.enum(['SUBMITTED', 'MATCHED', 'MISMATCHED', 'APPROVED', 'PAID']);

const invoiceSchema: z.ZodType<Invoice> = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  poId: z.string(),
  vendorId: z.string(),
  amount: z.number(),
  status: invoiceStatusSchema,
  fileUrl: z.string().nullable(),
  submittedAt: z.string(),
  amountDiff: z.number(),
  po: z.object({
    id: z.string(),
    poNumber: z.string(),
    totalAmount: z.number(),
    status: z.string(),
    createdAt: z.string(),
    items: z.unknown().optional(),
  }),
  vendor: z.object({
    id: z.string(),
    companyName: z.string(),
    email: z.string(),
  }),
});

const invoiceListResponseSchema: z.ZodType<InvoiceListResponse> = z.object({
  invoices: z.array(invoiceSchema),
  total: z.number(),
});

const singleInvoiceResponseSchema = z.object({ invoice: invoiceSchema });

export const invoiceService = {
  list: () => api.get('/invoices').then((r) => parseApiResponse(invoiceListResponseSchema, r.data)),

  get: (id: string) => api.get(`/invoices/${id}`).then((r) => parseApiResponse(singleInvoiceResponseSchema, r.data)),

  submit: (payload: { poId: string; amount: number; invoicePdf: File }) => {
    const formData = new FormData();
    formData.append('poId', payload.poId);
    formData.append('amount', String(payload.amount));
    formData.append('invoicePdf', payload.invoicePdf);

    return api.post('/invoices', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((r) => parseApiResponse(singleInvoiceResponseSchema, r.data));
  },

  approve: (id: string) =>
    api.patch(`/invoices/${id}/approve`).then((r) => parseApiResponse(singleInvoiceResponseSchema, r.data)),

  pay: (id: string) => api.patch(`/invoices/${id}/pay`).then((r) => parseApiResponse(singleInvoiceResponseSchema, r.data)),
};
