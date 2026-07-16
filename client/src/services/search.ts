import { z } from 'zod';
import api, { parseApiResponse } from './api';

export interface SearchVendor {
  id: string;
  companyName: string;
  status: string;
}

export interface SearchPO {
  id: string;
  poNumber: string;
  status: string;
}

export interface SearchInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
}

export interface SearchContract {
  id: string;
  title: string;
  status: string;
}

export interface CategorizedSearchResponse {
  vendors: SearchVendor[];
  purchaseOrders: SearchPO[];
  invoices: SearchInvoice[];
  contracts: SearchContract[];
}

const searchVendorSchema = z.object({
  id: z.string(),
  companyName: z.string(),
  status: z.string(),
});

const searchPOSchema = z.object({
  id: z.string(),
  poNumber: z.string(),
  status: z.string(),
});

const searchInvoiceSchema = z.object({
  id: z.string(),
  invoiceNumber: z.string(),
  status: z.string(),
});

const searchContractSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
});

const categorizedSearchResponseSchema = z.object({
  vendors: z.array(searchVendorSchema),
  purchaseOrders: z.array(searchPOSchema),
  invoices: z.array(searchInvoiceSchema),
  contracts: z.array(searchContractSchema),
});

export const searchService = {
  globalSearch: (query: string) =>
    api
      .get('/search', { params: { q: query } })
      .then((r) => parseApiResponse(categorizedSearchResponseSchema, r.data)),
};