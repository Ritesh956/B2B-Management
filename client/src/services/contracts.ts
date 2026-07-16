import { z } from 'zod';
import api, { parseApiResponse } from './api';

export enum ContractStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
}

export interface Vendor {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  status: string;
}

export interface Contract {
  id: string;
  vendorId: string;
  vendor: Vendor;
  title: string;
  startDate: string;
  endDate: string;
  fileUrl: string | null;
  status: ContractStatus;
  createdAt: string;
  daysUntilExpiry: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export interface ContractListResponse {
  contracts: Contract[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const contractStatusSchema = z.nativeEnum(ContractStatus);

const vendorSchema: z.ZodType<Vendor> = z.object({
  id: z.string(),
  companyName: z.string(),
  email: z.string(),
  phone: z.string(),
  status: z.string(),
});

const contractSchema: z.ZodType<Contract> = z.object({
  id: z.string(),
  vendorId: z.string(),
  vendor: vendorSchema,
  title: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  fileUrl: z.string().nullable(),
  status: contractStatusSchema,
  createdAt: z.string(),
  daysUntilExpiry: z.number(),
  isExpired: z.boolean(),
  isExpiringSoon: z.boolean(),
});

const contractListResponseSchema: z.ZodType<ContractListResponse> = z.object({
  contracts: z.array(contractSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
  }),
});

const singleContractResponseSchema = z.object({ contract: contractSchema });

export const listContracts = async (
  status?: string,
  searchVendor?: string,
  page = 1,
  limit = 20,
  expiringSoon?: boolean,
  filter?: string
): Promise<ContractListResponse> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (searchVendor) params.append('searchVendor', searchVendor);
  if (expiringSoon) params.append('expiringSoon', 'true');
  if (filter) params.append('filter', filter);
  params.append('page', String(page));
  params.append('limit', String(limit));

  const response = await api.get(`/contracts?${params.toString()}`);
  return parseApiResponse(contractListResponseSchema, response.data);
};

export const getContractById = async (id: string): Promise<{ contract: Contract }> => {
  const response = await api.get(`/contracts/${id}`);
  return parseApiResponse(singleContractResponseSchema, response.data);
};

export const createContract = async (payload: {
  vendorId: string;
  title: string;
  startDate: string;
  endDate: string;
  contractPdf?: File;
}): Promise<{ contract: Contract }> => {
  const formData = new FormData();
  formData.append('vendorId', payload.vendorId);
  formData.append('title', payload.title);
  formData.append('startDate', payload.startDate);
  formData.append('endDate', payload.endDate);
  if (payload.contractPdf) {
    formData.append('contractPdf', payload.contractPdf);
  }

  const response = await api.post('/contracts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return parseApiResponse(singleContractResponseSchema, response.data);
};

export const updateContractStatus = async (
  id: string,
  status: ContractStatus
): Promise<{ contract: Contract }> => {
  const response = await api.patch(`/contracts/${id}`, { status });
  return parseApiResponse(singleContractResponseSchema, response.data);
};
