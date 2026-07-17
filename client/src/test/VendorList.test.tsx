import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VendorList from '../pages/Vendors/VendorList';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../store/authStore', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useAuthStore: (selector: any) => selector({ user: { role: 'ADMIN' }, token: 'fake-token', isLoading: false }),
  };
});

vi.mock('../hooks/useVendorsQuery', () => ({
  useVendorsQuery: () => ({ data: { vendors: [], total: 0 }, isLoading: false, refetch: vi.fn() }),
}));

const renderVendorList = () => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <VendorList />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('VendorList', () => {
  it('should render the empty state and an "Add Vendor" action when no vendors exist', async () => {
    renderVendorList();
    expect(await screen.findByText('No vendors yet')).toBeInTheDocument();
    expect(screen.getByText(/add vendor/i)).toBeInTheDocument();
  });
});
