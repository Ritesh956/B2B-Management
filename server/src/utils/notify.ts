import { prisma } from '../config/prisma';
import { getIo } from './socket';

export const notifyUser = async (userId: string, message: string, type: string = 'INFO'): Promise<void> => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        message,
        read: false,
      },
    });

    try {
      const io = getIo();
      io.to(userId).emit('notification', notification);
    } catch (socketErr) {
      console.warn('[notifyUser] Failed to emit via Socket.io. Is the server running?', socketErr);
    }
  } catch (err) {
    console.error('[notifyUser] Failed to create notification in DB', err);
  }
};
