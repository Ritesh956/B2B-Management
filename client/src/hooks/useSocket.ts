import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) return;

    const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

    const newSocket = io(apiUrl, {
      auth: { token },
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected', newSocket.id);
      setSocket(newSocket);
    });

    newSocket.on('notification', (notification) => {
      toast.success(notification.message, { duration: 4000 });
      // Invalidate queries to update bell and dropdown list
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setSocket(null);
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, [token, queryClient]);

  return socket;
}
