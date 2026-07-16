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

// Redirect to /login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
