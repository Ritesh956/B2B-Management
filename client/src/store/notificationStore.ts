import { create } from 'zustand';
import { notificationService, type NotificationItem } from '../services/notifications';

// Shared between the polling fallback (NotificationBell's interval) and the
// Socket.io push (useSocket) so both write into the same list instead of
// each keeping its own out-of-sync copy.
interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  fetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  receivePush: (notification: NotificationItem) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetch: async () => {
    set({ loading: true });
    try {
      const data = await notificationService.list();
      set({ notifications: data.notifications, unreadCount: data.unreadCount, loading: false });
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      set({ loading: false });
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationService.markAsRead(id);
      set((state) => {
        const wasUnread = state.notifications.find((n) => n.id === id)?.read === false;
        return {
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationService.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  },

  // Called by useSocket when a 'notification' event arrives — prepends
  // instead of waiting for the next poll, which is the whole point of
  // wiring the socket up in the first place.
  receivePush: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 20),
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    }));
  },
}));
