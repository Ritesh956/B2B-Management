import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RoleGate } from '../components/RoleGate';
import { useAuthStore } from '../store/authStore';

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('RoleGate', () => {
  it('should render children if user has allowed role', () => {
    (useAuthStore as unknown as any).mockReturnValue({ user: { role: 'ADMIN' } });
    render(
      <RoleGate allowedRoles={['ADMIN', 'FINANCE']}>
        <div data-testid="protected-content">Content</div>
      </RoleGate>
    );
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should not render children if user does not have allowed role', () => {
    (useAuthStore as unknown as any).mockReturnValue({ user: { role: 'VENDOR' } });
    render(
      <RoleGate allowedRoles={['ADMIN', 'FINANCE']}>
        <div data-testid="protected-content">Content</div>
      </RoleGate>
    );
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should not render children if user is not logged in', () => {
    (useAuthStore as unknown as any).mockReturnValue({ user: null });
    render(
      <RoleGate allowedRoles={['ADMIN', 'FINANCE']}>
        <div data-testid="protected-content">Content</div>
      </RoleGate>
    );
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
