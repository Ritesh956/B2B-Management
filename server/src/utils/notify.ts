import { prisma } from '../config/prisma';
import { getIo } from './socket';

export interface NotifyLink {
  entity: 'PurchaseOrder' | 'Invoice' | 'Vendor' | 'Contract';
  entityId: string;
}

export const notifyUser = async (userId: string, message: string, type: string = 'INFO', link?: NotifyLink): Promise<void> => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        message,
        read: false,
        entity: link?.entity ?? null,
        entityId: link?.entityId ?? null,
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
