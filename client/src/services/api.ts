import axios from 'axios';
import { z } from 'zod';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '/api/v1'),
});

export const parseApiResponse = <T>(schema: z.ZodType<T>, data: unknown): T => {
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    console.error('Zod Parsing Error:', parsed.error);
    throw new Error('Invalid API response payload');
  }

  return parsed.data;
};

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A real 401 means the token is genuinely invalid/expired — that's still a
// hard logout. But `window.location.href` was a full page reload, which blew
// away the entire SPA (including any unrelated unsaved form the user had open
// in another part of the app) even though a client-side redirect would do.
// authStore registers a handler here at startup so this module doesn't have
// to import authStore directly (that would be a circular import: authStore
// already imports this file to make its API calls).
let onUnauthorized: (() => void) | null = null;
export const registerUnauthorizedHandler = (handler: () => void): void => {
  onUnauthorized = handler;
};

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      onUnauthorized?.();
    }
    return Promise.reject(err);
  }
);

export default api;
