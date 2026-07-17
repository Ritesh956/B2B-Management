import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuthStore } from '../store/authStore';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('ProtectedRoute', () => {
  it('should redirect to /login if no token', () => {
    (useAuthStore as unknown as any).mockReturnValue({ token: null });
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
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-page')).not.toBeInTheDocument();
  });

  it('should render Outlet if token exists', () => {
    (useAuthStore as unknown as any).mockReturnValue({ token: 'fake-token' });
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
    expect(screen.getByTestId('protected-page')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });
});
