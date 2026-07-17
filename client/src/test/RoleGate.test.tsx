import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RoleGate from '../components/RoleGate';
import { Role } from '../store/authStore';

let mockState: { user: { role: string } | null };

vi.mock('../store/authStore', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useAuthStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  };
});

describe('RoleGate', () => {
  it('should render children if user has allowed role', () => {
    mockState = { user: { role: 'ADMIN' } };
    render(
      <RoleGate roles={[Role.ADMIN, Role.FINANCE]}>
        <div data-testid="protected-content">Content</div>
      </RoleGate>
    );
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should not render children if user does not have allowed role', () => {
    mockState = { user: { role: 'VENDOR' } };
    render(
      <RoleGate roles={[Role.ADMIN, Role.FINANCE]}>
        <div data-testid="protected-content">Content</div>
      </RoleGate>
    );
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should not render children if user is not logged in', () => {
    mockState = { user: null };
    render(
      <RoleGate roles={[Role.ADMIN, Role.FINANCE]}>
        <div data-testid="protected-content">Content</div>
      </RoleGate>
    );
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
