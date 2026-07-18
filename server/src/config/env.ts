import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  // SMTP is optional: email delivery degrades gracefully (enqueueEmail skips
  // with a warning when SMTP_HOST is unset) and toggle2fa refuses to enable
  // 2FA so nobody gets locked out behind an OTP email that can't send.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  PORT: z.string().optional(),
  // Public URL of this API server — used to build the absolute URLs stored in
  // fileUrl for uploaded documents. Without it, uploads get a localhost URL
  // baked into the DB and are unreachable from the deployed client.
  PUBLIC_BASE_URL: z.string().optional(),
  // Base URL of the deployed client, used to build reset-password/accept-
  // invite links. Optional with a fallback (see auth.ts/users.ts) so a
  // missing env var doesn't crash the whole server over two email links.
  CLIENT_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${String(issue.path[0])}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsed.data;

if (!env.SMTP_HOST) {
  console.warn('⚠️  SMTP_HOST is not set — outgoing email (OTP codes, reset/invite links, notifications) is disabled.');
}
