import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VendorList from '../pages/Vendors/VendorList';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

vi.mock('../hooks/useSocket', () => ({
  useSocket: () => ({ on: vi.fn(), off: vi.fn() }),
}));

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { vendors: [], total: 0 } }),
  },
}));

describe('VendorList', () => {
  it('should render the table and empty state when no vendors', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <VendorList />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(await screen.findByText('No vendors found')).toBeInTheDocument();
    expect(screen.getByText('Add Vendor')).toBeInTheDocument();
  });
});
