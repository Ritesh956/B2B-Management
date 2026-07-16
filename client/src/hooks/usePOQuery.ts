import { useQuery } from '@tanstack/react-query';
import { poService, type POStatus } from '../services/pos';

type POListParams = {
  status?: POStatus | '' | string;
  vendorId?: string;
  minAmount?: string;
  maxAmount?: string;
  fromDate?: string;
  toDate?: string;
  createdById?: string;
};

export const poQueryKeys = {
  all: ['pos'] as const,
  list: (params?: POListParams) => [...poQueryKeys.all, 'list', params ?? {}] as const,
  detail: (id: string) => [...poQueryKeys.all, 'detail', id] as const,
};

export const usePOsQuery = (params?: POListParams) =>
  useQuery({
    queryKey: poQueryKeys.list(params),
    queryFn: () => poService.list(params),
  });

export const usePOQuery = (id: string) =>
  useQuery({
    queryKey: poQueryKeys.detail(id),
    queryFn: () => poService.get(id),
    enabled: Boolean(id),
  });
