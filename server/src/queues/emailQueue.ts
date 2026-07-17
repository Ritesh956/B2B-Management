import Queue from 'bull';
import nodemailer from 'nodemailer';
import { isRedisAvailable } from './redisAvailability';

export type SendEmailJob = {
  to: string;
  subject: string;
  html: string;
};

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER && process.env.SMTP_PASS
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

export const emailQueue = new Queue<SendEmailJob>('emailQueue', redisUrl);

emailQueue.process('sendEmail', async (job) => {
  const { to, subject, html } = job.data;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.EMAIL_FROM || 'noreply@vendorplatform.dev',
    to,
    subject,
    html,
  });
});

emailQueue.on('failed', (job, err) => {
  console.error(`[emailQueue] Job ${job?.id} failed`, err);
});

import { prisma } from '../config/prisma';

export const enqueueEmail = async (payload: SendEmailJob): Promise<void> => {
  if (!(await isRedisAvailable())) {
    console.warn('[emailQueue] Redis unavailable, skipping email enqueue');
    return;
  }

  // Check notification preferences if sending to a user email
  const user = await prisma.user.findUnique({ where: { email: payload.to } });
  if (user && user.notificationPreferences) {
    const prefs = user.notificationPreferences as any;
    if (prefs.emailEnabled === false) {
      console.log(`[emailQueue] Skipping email to ${payload.to} due to notification preferences`);
      return;
    }
  }

  await emailQueue.add('sendEmail', payload, {
    attempts: 3,
    backoff: { type: 'fixed', delay: 5000 },
    removeOnComplete: true,
    removeOnFail: 50,
  });
};
