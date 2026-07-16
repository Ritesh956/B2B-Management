import api from './api';
import { Role } from '../store/authStore';

export type UserStatus = 'INVITED' | 'ACTIVE' | 'INACTIVE';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
};

export const listUsers = async (): Promise<{ users: User[] }> => {
  const { data } = await api.get('/users');
  return data;
};

export const inviteUser = async (payload: { email: string; name: string; role: Role }): Promise<{ message: string }> => {
  const { data } = await api.post('/users/invite', payload);
  return data;
};

export const getInviteToken = async (token: string): Promise<{ email: string; name: string }> => {
  const { data } = await api.get(`/users/accept-invite/${token}`);
  return data;
};

export const acceptInvite = async (token: string, payload: { password: string; name: string }): Promise<{ message: string }> => {
  const { data } = await api.post(`/users/accept-invite/${token}`, payload);
  return data;
};

export const updateUserRole = async (id: string, role: Role): Promise<{ user: User }> => {
  const { data } = await api.patch(`/users/${id}/role`, { role });
  return data;
};

export const deactivateUser = async (id: string): Promise<{ user: User }> => {
  const { data } = await api.post(`/users/${id}/deactivate`, {});
  return data;
};
