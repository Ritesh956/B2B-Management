import { useQuery } from '@tanstack/react-query';
import { vendorService } from '../services/vendors';

export const vendorQueryKeys = {
  all: ['vendors'] as const,
  list: (params: { status?: string; search?: string; page?: number; limit?: number }) =>
    [...vendorQueryKeys.all, 'list', params] as const,
  detail: (id: string) => [...vendorQueryKeys.all, 'detail', id] as const,
  performance: () => [...vendorQueryKeys.all, 'performance'] as const,
};

export const useVendorsQuery = (params: { status?: string; search?: string; page?: number; limit?: number }) =>
  useQuery({
    queryKey: vendorQueryKeys.list(params),
    queryFn: () => vendorService.list(params),
  });

export const useVendorQuery = (id: string) =>
  useQuery({
    queryKey: vendorQueryKeys.detail(id),
    queryFn: () => vendorService.get(id),
    enabled: Boolean(id),
  });

export const useVendorPerformanceQuery = () =>
  useQuery({
    queryKey: vendorQueryKeys.performance(),
    queryFn: () => vendorService.listPerformance(),
  });
