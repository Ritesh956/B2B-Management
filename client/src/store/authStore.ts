import { create } from 'zustand';
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
  companyId: string | null;
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
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      if (data.requiresOtp) {
        set({ isLoading: false });
        return data; // { requiresOtp: true, tempToken: string }
      }

      localStorage.setItem('token', data.token);

      // Fetch user profile immediately after login
      const me = await api.get('/auth/me');

      set({
        token: data.token,
        user: me.data.user,
        isLoading: false
      });

      return {};
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  verifyOtp: async (tempToken, otp) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/verify-otp', { otp }, {
        headers: { Authorization: `Bearer ${tempToken}` }
      });

      localStorage.setItem('token', data.token);
      const me = await api.get('/auth/me');

      set({
        token: data.token,
        user: me.data.user,
        isLoading: false
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
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
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null, isLoading: false });
    }
  },
}));