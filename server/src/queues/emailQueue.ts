import Queue from 'bull';
import nodemailer from 'nodemailer';
import { isRedisAvailable } from './redisAvailability';

export type SendEmailJob = {
  to: string;
  subject: string;
  html: string;
};

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// No SMTP_HOST → no transporter. The old fallback to smtp.gmail.com meant a
// missing config silently queued mail that then failed with ENETUNREACH on
// every attempt; skipping the enqueue up front (see enqueueEmail) makes the
// degraded state explicit in the logs instead.
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    })
  : null;

export const emailQueue = new Queue<SendEmailJob>('emailQueue', redisUrl);

emailQueue.process('sendEmail', async (job) => {
  const { to, subject, html } = job.data;

  if (!transporter) {
    console.warn('[emailQueue] SMTP not configured — dropping email:', subject);
    return;
  }

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
  if (!transporter) {
    console.warn(`[emailQueue] SMTP not configured — skipping email "${payload.subject}" to ${payload.to}`);
    return;
  }

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
