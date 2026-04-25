import { useQuery } from '@tanstack/react-query';
import { poService, type POStatus } from '../services/pos';

export const poQueryKeys = {
  all: ['pos'] as const,
  list: (params?: { status?: POStatus | '' }) => [...poQueryKeys.all, 'list', params ?? {}] as const,
  detail: (id: string) => [...poQueryKeys.all, 'detail', id] as const,
};

export const usePOsQuery = (params?: { status?: POStatus | '' }) =>
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
