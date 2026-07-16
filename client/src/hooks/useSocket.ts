import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    
    const socket = io(apiUrl, {
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected', socket.id);
    });

    socket.on('notification', (notification) => {
      toast.success(notification.message, { duration: 4000 });
      // Invalidate queries to update bell and dropdown list
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, queryClient]);

  return socketRef.current;
}
