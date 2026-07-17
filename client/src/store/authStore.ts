import { create } from 'zustand';
import { isAxiosError } from 'axios';
import api from '../services/api';

// CHANGED: Use 'export enum' instead of 'type' so it exists at runtime
export enum Role {
  ADMIN = 'ADMIN',
  FINANCE = 'FINANCE',
  PROCUREMENT = 'PROCUREMENT',
  MANAGER = 'MANAGER',
  VENDOR = 'VENDOR'
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;

  notificationPreferences?: {
    emailEnabled: boolean;
    poApprovals: boolean;
    invoiceUpdates: boolean;
    contractReminders: boolean;
  } | null;
  isTwoFactorEnabled?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ requiresOtp?: boolean; tempToken?: string }>;
  verifyOtp: (tempToken: string, otp: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  // Start in a loading state whenever a token is present, so the app waits
  // for hydrate() to confirm the session before any route guard evaluates
  // `user` (which is still null at this point). Otherwise a hard reload of a
  // role-gated route (e.g. /vendor/*) bounces the user to /login before
  // hydrate() has had a chance to resolve.
  isLoading: !!localStorage.getItem('token'),

  // NOTE: login/verifyOtp must NOT touch the global `isLoading` flag — App.tsx
  // unmounts the whole router (spinner screen) while it's true, which kills
  // the login page mid-submit and makes its navigate() a no-op, bouncing the
  // user back to /login even though the login succeeded. `isLoading` belongs
  // to hydrate() alone; the login form has its own isSubmitting state.
  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });

    if (data.requiresOtp) {
      return data; // { requiresOtp: true, tempToken: string }
    }

    localStorage.setItem('token', data.token);

    // Fetch user profile immediately after login
    const me = await api.get('/auth/me');

    set({
      token: data.token,
      user: me.data.user,
    });

    return {};
  },

  verifyOtp: async (tempToken, otp) => {
    const { data } = await api.post('/auth/verify-otp', { otp }, {
      headers: { Authorization: `Bearer ${tempToken}` }
    });

    localStorage.setItem('token', data.token);
    const me = await api.get('/auth/me');

    set({
      token: data.token,
      user: me.data.user,
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  hydrate: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, token, isLoading: false });
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      if (status === 401 || status === 403) {
        // Token is genuinely invalid or expired — safe to clear.
        localStorage.removeItem('token');
        set({ user: null, token: null, isLoading: false });
      } else {
        // Rate-limited, offline, or a transient server error — the session
        // itself may still be valid, so don't destroy it. Keep the token and
        // let the next successful request (or the 401 interceptor) resolve it.
        set({ isLoading: false });
      }
    }
  },
}));