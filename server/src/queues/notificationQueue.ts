import Queue from 'bull';
import { prisma } from '../config/prisma';
import { isRedisAvailable } from './redisAvailability';

export type NotificationJob = {
  userId: string;
  message: string;
};

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const notificationQueue = new Queue<NotificationJob>('notificationQueue', redisUrl);

notificationQueue.process('createNotification', async (job) => {
  const { userId, message } = job.data;

  await prisma.notification.create({
    data: {
      userId,
      message,
    },
  });
});

notificationQueue.on('failed', (job, err) => {
  console.error(`[notificationQueue] Job ${job?.id} failed`, err);
});

export const enqueueNotification = async (payload: NotificationJob): Promise<void> => {
  if (!(await isRedisAvailable())) {
    console.warn('[notificationQueue] Redis unavailable, skipping notification enqueue');
    return;
  }

  await notificationQueue.add('createNotification', payload, {
    attempts: 3,
    backoff: { type: 'fixed', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: 50,
  });
};
