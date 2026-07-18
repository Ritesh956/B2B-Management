import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { allowedOriginsForSocketIo } from '../config/cors';

let io: Server;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      // Same origin policy as the REST API (config/cors.ts) — this was '*'.
      origin: (origin, callback) => allowedOriginsForSocketIo(origin as string | undefined, callback),
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; is2faPending?: boolean };

      // Same rules as the HTTP `authenticate` middleware: a 2FA-pending temp
      // token is not a session, and a deactivated/deleted user's still-valid
      // JWT must not open a live channel.
      if (decoded.is2faPending) {
        return next(new Error('Authentication error: Two-factor verification required'));
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, isActive: true },
      });
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid token'));
      }

      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`[Socket.io] User connected: ${userId} (${socket.id})`);

    // Join a room named after the userId
    socket.join(userId);

    socket.on('disconnect', () => {
      console.log(`[Socket.io] User disconnected: ${userId} (${socket.id})`);
    });
  });

  return io;
};

export const getIo = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
