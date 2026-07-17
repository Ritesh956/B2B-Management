import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProtectedRoute from '../components/ProtectedRoute';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

let mockState: { token: string | null; isLoading: boolean };

vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: any) => selector(mockState),
}));

const renderGuarded = () =>
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/protected" element={<div data-testid="protected-page">Protected Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe('ProtectedRoute', () => {
  it('should redirect to /login if no token', () => {
    mockState = { token: null, isLoading: false };
    renderGuarded();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
  });

  it('should render Outlet if token exists', () => {
    mockState = { token: 'fake-token', isLoading: false };
    renderGuarded();
    expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('should show a loading state instead of redirecting while session is being restored', () => {
    mockState = { token: 'fake-token', isLoading: true };
    renderGuarded();
    expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });
});
