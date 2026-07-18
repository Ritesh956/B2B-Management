import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';

export const listNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: req.user.id,
        read: false,
      },
    });

    res.status(200).json({ notifications, unreadCount });
  } catch (err) {
    console.error('[listNotifications]', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });

    res.status(200).json({ updated: result.count });
  } catch (err) {
    console.error('[markAllNotificationsAsRead]', err);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
};

export const markNotificationAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { id } = req.params as { id: string };

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== req.user.id) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.status(200).json({ notification });
  } catch (err) {
    console.error('[markNotificationAsRead]', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
};
