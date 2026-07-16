import { useQuery } from '@tanstack/react-query';
import { listContracts, getContractById } from '../services/contracts';

export const contractQueryKeys = {
  all: ['contracts'] as const,
  list: (params: {
    status?: string;
    searchVendor?: string;
    page?: number;
    limit?: number;
    expiringSoon?: boolean;
    filter?: string;
  }) => [...contractQueryKeys.all, 'list', params] as const,
  detail: (id: string) => [...contractQueryKeys.all, 'detail', id] as const,
};

export const useContractsQuery = (params: {
  status?: string;
  searchVendor?: string;
  page?: number;
  limit?: number;
  expiringSoon?: boolean;
  filter?: string;
}) =>
  useQuery({
    queryKey: contractQueryKeys.list(params),
    queryFn: () =>
      listContracts(
        params.status,
        params.searchVendor,
        params.page ?? 1,
        params.limit ?? 20,
        params.expiringSoon,
        params.filter
      ),
  });

export const useContractQuery = (id: string) =>
  useQuery({
    queryKey: contractQueryKeys.detail(id),
    queryFn: () => getContractById(id),
    enabled: Boolean(id),
  });
