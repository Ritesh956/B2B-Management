import { useQuery } from '@tanstack/react-query';
import { invoiceService } from '../services/invoices';

export const invoiceQueryKeys = {
  all: ['invoices'] as const,
  list: () => [...invoiceQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...invoiceQueryKeys.all, 'detail', id] as const,
};

export const useInvoicesQuery = () =>
  useQuery({
    queryKey: invoiceQueryKeys.list(),
    queryFn: () => invoiceService.list(),
  });

export const useInvoiceQuery = (id: string) =>
  useQuery({
    queryKey: invoiceQueryKeys.detail(id),
    queryFn: () => invoiceService.get(id),
    enabled: Boolean(id),
  });
