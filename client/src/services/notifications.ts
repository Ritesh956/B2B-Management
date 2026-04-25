import { z } from 'zod';
import api, { parseApiResponse } from './api';

export interface NotificationItem {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const notificationSchema: z.ZodType<NotificationItem> = z.object({
  id: z.string(),
  userId: z.string(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
});

const notificationListResponseSchema = z.object({
  notifications: z.array(notificationSchema),
  unreadCount: z.number(),
});

const singleNotificationResponseSchema = z.object({
  notification: notificationSchema,
});

export const notificationService = {
  list: () =>
    api.get('/notifications').then((r) => parseApiResponse(notificationListResponseSchema, r.data)),
  markAsRead: (id: string) =>
    api
      .patch(`/notifications/${id}/read`)
      .then((r) => parseApiResponse(singleNotificationResponseSchema, r.data)),
};
