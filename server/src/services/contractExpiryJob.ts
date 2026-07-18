import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { Role, ContractStatus } from '@prisma/client';
import { enqueueEmail } from '../queues';
import { notifyUser } from '../utils/notify';
import { escapeHtml } from '../utils/escapeHtml';

// The actual sweep, extracted so it can run both on the daily cron AND once
// at boot — on Render's free tier the instance sleeps between requests, so
// a cron alone frequently has nothing awake at 09:00 to fire it.
export const runContractExpiryCheck = async (): Promise<void> => {
  console.log('[ContractExpiryJob] Running contract expiry check...');

  const now = new Date();

  // This job only ever emailed an alert for contracts expiring soon -
  // it never actually flipped Contract.status to EXPIRED once endDate
  // passed, so the stored status silently went stale forever (most
  // reads work around this by checking endDate directly instead of
  // trusting status, but that's a workaround, not a fix). Do the actual
  // transition first.
  const expiredResult = await prisma.contract.updateMany({
    where: { status: ContractStatus.ACTIVE, endDate: { lt: now } },
    data: { status: ContractStatus.EXPIRED },
  });
  if (expiredResult.count > 0) {
    console.log(`[ContractExpiryJob] Marked ${expiredResult.count} contract(s) as EXPIRED.`);
  }

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // Find contracts expiring within 30 days and are still active
  const expiringContracts = await prisma.contract.findMany({
    where: {
      status: ContractStatus.ACTIVE,
      endDate: {
        lte: thirtyDaysFromNow,
        gte: now,
      },
    },
    include: {
      vendor: true,
    },
  });

  if (expiringContracts.length === 0) {
    console.log('[ContractExpiryJob] No contracts expiring soon.');
    return;
  }

  // Get all ADMIN users for email notification
  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { id: true, email: true },
  });
  const recipientEmails = [...new Set(admins.map((u) => u.email))];

  if (recipientEmails.length === 0) {
    console.log('[ContractExpiryJob] No ADMIN users to notify.');
    return;
  }

  // Build email content. Titles/company names are user-supplied — escape
  // them, this lands inside an HTML email body.
  const contractList = expiringContracts
    .map(c => {
      const daysLeft = Math.ceil((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `- ${escapeHtml(c.title)} (Vendor: ${escapeHtml(c.vendor.companyName)}) - Expires in ${daysLeft} days (${c.endDate.toDateString()})`;
    })
    .join('\n');

  await Promise.allSettled([
    enqueueEmail({
      to: recipientEmails.join(','),
      subject: `Contracts expiring soon (${expiringContracts.length})`,
      html: `<p>The following contracts are expiring within 30 days and require attention:</p><pre>${contractList}</pre>`,
    }),
    ...admins.map((admin) =>
      notifyUser(admin.id, `${expiringContracts.length} contract(s) expiring within 30 days`, 'INFO')
    ),
  ]);

  console.log(`[ContractExpiryJob] Queued alerts for ${recipientEmails.length} admin users.`);
};

export const startContractExpiryJob = () => {
  // Run daily at 9 AM IST. Without an explicit timezone, node-cron uses the
  // server's system clock - Render runs UTC, so "9 AM" would actually fire
  // at 2:30 PM IST, not the intended start-of-business alert time.
  cron.schedule('0 9 * * *', async () => {
    try {
      await runContractExpiryCheck();
    } catch (err) {
      console.error('[ContractExpiryJob] Error:', err);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('[ContractExpiryJob] Scheduled to run daily at 09:00 AM IST (plus one boot-time sweep)');
};
