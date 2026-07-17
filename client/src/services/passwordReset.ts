import api from './api';

export const forgotPassword = (email: string): Promise<{ message: string }> =>
  api.post('/auth/forgot-password', { email }).then((r) => r.data);

export const validateResetToken = (token: string): Promise<{ valid: boolean }> =>
  api.get(`/auth/reset-password/${token}`).then((r) => r.data);

export const resetPassword = (token: string, password: string): Promise<{ message: string }> =>
  api.post(`/auth/reset-password/${token}`, { password }).then((r) => r.data);
