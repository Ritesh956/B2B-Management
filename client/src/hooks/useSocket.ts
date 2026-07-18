import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import toast from 'react-hot-toast';

let activeSocket: Socket | null = null;

// Mounted once per layout (AppLayout / VendorLayout) rather than per
// component that wants live updates — a single socket per session, pushed
// into the shared notification store so NotificationBell (and anything else
// that reads that store) updates without polling.
export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const receivePush = useNotificationStore((s) => s.receivePush);

  useEffect(() => {
    if (!token) return;

    const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

    const socket = io(apiUrl, { auth: { token } });
    activeSocket = socket;

    socket.on('notification', (notification) => {
      receivePush(notification);
      toast.success(notification.message, { duration: 4000 });
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error', err.message);
    });

    return () => {
      socket.disconnect();
      if (activeSocket === socket) activeSocket = null;
    };
  }, [token, receivePush]);
}
