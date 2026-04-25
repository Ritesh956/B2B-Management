import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { Role, ContractStatus } from '@prisma/client';
import { enqueueEmail, enqueueNotification } from '../queues';

export const startContractExpiryJob = () => {
  // Run daily at 9 AM (0 9 * * *)
  cron.schedule('0 9 * * *', async () => {
    console.log('[ContractExpiryJob] Running contract expiry check...');

    try {
      const now = new Date();
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

      // Build email content
      const contractList = expiringContracts
        .map(c => {
          const daysLeft = Math.ceil((c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return `- ${c.title} (Vendor: ${c.vendor.companyName}) - Expires in ${daysLeft} days (${c.endDate.toDateString()})`;
        })
        .join('\n');

      await Promise.allSettled([
        enqueueEmail({
          to: recipientEmails.join(','),
          subject: `Contracts expiring soon (${expiringContracts.length})`,
          html: `<p>The following contracts are expiring within 30 days and require attention:</p><pre>${contractList}</pre>`,
        }),
        ...admins.map((admin) =>
          enqueueNotification({
            userId: admin.id,
            message: `${expiringContracts.length} contract(s) expiring within 30 days`,
          })
        ),
      ]);

      console.log(`[ContractExpiryJob] Queued alerts for ${recipientEmails.length} admin users.`);
    } catch (err) {
      console.error('[ContractExpiryJob] Error:', err);
    }
  });

  console.log('[ContractExpiryJob] Scheduled to run daily at 09:00 AM');
};
