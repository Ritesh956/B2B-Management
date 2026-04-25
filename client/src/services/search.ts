import { z } from 'zod';
import api, { parseApiResponse } from './api';

export type SearchResultType = 'Vendor' | 'PurchaseOrder' | 'Invoice';

export interface GlobalSearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const globalSearchResultSchema: z.ZodType<GlobalSearchResult> = z.object({
  type: z.enum(['Vendor', 'PurchaseOrder', 'Invoice']),
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  href: z.string(),
});

const globalSearchResponseSchema = z.object({
  results: z.array(globalSearchResultSchema),
});

export const searchService = {
  globalSearch: (query: string) =>
    api
      .get('/search', { params: { query } })
      .then((r) => parseApiResponse(globalSearchResponseSchema, r.data)),
};