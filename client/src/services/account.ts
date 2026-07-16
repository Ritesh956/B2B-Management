import { z } from 'zod';
import api, { parseApiResponse } from './api';

export interface AccountNotificationPreferences {
  emailEnabled: boolean;
  poApprovals: boolean;
  invoiceUpdates: boolean;
  contractReminders: boolean;
}

export interface AccountProfile {
  id: string;
  name: string;
  email: string;
  role: string;

  notificationPreferences: AccountNotificationPreferences | null;
  createdAt: string;
  company: unknown;
}

const accountNotificationPreferencesSchema: z.ZodType<AccountNotificationPreferences> = z.object({
  emailEnabled: z.boolean(),
  poApprovals: z.boolean(),
  invoiceUpdates: z.boolean(),
  contractReminders: z.boolean(),
});

const accountProfileSchema: z.ZodType<AccountProfile> = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),

  notificationPreferences: accountNotificationPreferencesSchema.nullable(),
  createdAt: z.string(),
  company: z.unknown(),
});

const accountResponseSchema = z.object({
  user: accountProfileSchema,
});

export const accountService = {
  getMe: () => api.get('/auth/me').then((r) => parseApiResponse(accountResponseSchema, r.data)),
  updateMe: (payload: {
    name: string;
    email: string;
    password?: string;
    notificationPreferences: AccountNotificationPreferences;
  }) => api.patch('/auth/me', payload).then((r) => parseApiResponse(accountResponseSchema, r.data)),
};