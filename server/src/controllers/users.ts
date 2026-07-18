import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';
import { Role, UserStatus, AuthTokenPurpose } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { enqueueEmail } from '../queues';

const INVITE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MIN_PASSWORD_LENGTH = 8;
const clientUrl = (process.env.CLIENT_URL || 'https://rit-vendor.vercel.app').replace(/\/$/, '');

// Guard for the two actions that can permanently lock an org out of its own
// admin panel: demoting or deactivating the only remaining active admin.
const countOtherActiveAdmins = async (excludingUserId: string): Promise<number> =>
  prisma.user.count({
    where: {
      role: Role.ADMIN,
      isActive: true,
      id: { not: excludingUserId },
    },
  });

export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Only admins can view users' });
      return;
    }
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, status: true, lastLogin: true, isActive: true, createdAt: true }
    });
    res.status(200).json({ users });
  } catch (err) {
    console.error('[listUsers]', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const issueInviteToken = async (userId: string): Promise<string> => {
  // Any previous outstanding invite for this user dies when a new one is
  // issued — only the most recent link works.
  await prisma.authToken.updateMany({
    where: { userId, purpose: AuthTokenPurpose.INVITE, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString('hex');
  await prisma.authToken.create({
    data: {
      token,
      userId,
      purpose: AuthTokenPurpose.INVITE,
      expiresAt: new Date(Date.now() + INVITE_TOKEN_TTL_MS),
    },
  });
  return token;
};

const sendInviteEmail = async (email: string, role: Role, token: string): Promise<void> => {
  const inviteLink = `${clientUrl}/accept-invite/${token}`;
  await enqueueEmail({
    to: email,
    subject: 'You\'ve been invited to VendorHub',
    html: `<p>An administrator invited you to join VendorHub as ${role}. This link expires in 24 hours:</p><p><a href="${inviteLink}">${inviteLink}</a></p>`,
  });
};

export const inviteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Only admins can invite users' });
      return;
    }
    const { email, role, name } = req.body as { email?: string; role?: Role; name?: string };
    if (!email || !role || !name) {
      res.status(400).json({ error: 'Email, name, and role are required' });
      return;
    }

    if (!Object.values(Role).includes(role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${Object.values(Role).join(', ')}` });
      return;
    }

    // An invited VENDOR user would have no matching Vendor row (the invite
    // form collects no company name/phone), so their entire portal would 404
    // with "Vendor profile not found". Vendors self-register instead — that
    // flow creates both rows together.
    if (role === Role.VENDOR) {
      res.status(400).json({ error: 'Vendor accounts cannot be invited — vendors must self-register from the registration page, which also creates their company profile.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      // A user stuck in INVITED never completed onboarding — re-issue the
      // invite instead of hard-failing (the old behavior dead-ended expired
      // invites permanently).
      if (existing.status === UserStatus.INVITED) {
        const token = await issueInviteToken(existing.id);
        await sendInviteEmail(existing.email, existing.role, token);
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'RESEND_INVITE',
            entity: 'User',
            entityId: existing.id,
            metadata: { email: existing.email, role: existing.role },
          },
        });
        res.status(200).json({ message: 'This user had a pending invite — a fresh invite link has been sent.' });
        return;
      }
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    // Create user with a dummy password
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role,
        password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10),
        status: UserStatus.INVITED,
        isActive: true,
      }
    });

    const token = await issueInviteToken(user.id);
    await sendInviteEmail(user.email, role, token);

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'INVITE',
        entity: 'User',
        entityId: user.id,
        metadata: { email: user.email, role },
      },
    });

    res.status(201).json({ message: 'User invited successfully' });
  } catch (err) {
    console.error('[inviteUser]', err);
    res.status(500).json({ error: 'Failed to invite user' });
  }
};

export const getInviteToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params as { token: string };
    const entry = await prisma.authToken.findUnique({ where: { token } });
    if (!entry || entry.purpose !== AuthTokenPurpose.INVITE || entry.usedAt || entry.expiresAt < new Date()) {
      res.status(404).json({ error: 'Invalid or expired invite token' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: entry.userId }, select: { email: true, name: true } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ email: user.email, name: user.name });
  } catch (err) {
    console.error('[getInviteToken]', err);
    res.status(500).json({ error: 'Failed to validate invite token' });
  }
};

export const acceptInvite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params as { token: string };
    const { password, name } = req.body;
    if (!password || !name) {
      res.status(400).json({ error: 'Password and name are required' });
      return;
    }

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
      res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return;
    }

    const entry = await prisma.authToken.findUnique({ where: { token } });
    if (!entry || entry.purpose !== AuthTokenPurpose.INVITE || entry.usedAt || entry.expiresAt < new Date()) {
      res.status(404).json({ error: 'Invalid or expired invite token' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: entry.userId },
        data: {
          name,
          password: hashedPassword,
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.authToken.update({ where: { token }, data: { usedAt: new Date() } }),
    ]);

    res.status(200).json({ message: 'Invite accepted successfully' });
  } catch (err) {
    console.error('[acceptInvite]', err);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Only admins can update roles' });
      return;
    }
    const { id } = req.params as { id: string };
    const { role } = req.body as { role?: Role };

    if (!role || !Object.values(Role).includes(role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${Object.values(Role).join(', ')}` });
      return;
    }

    // Role changes to/from VENDOR break the email-linked Vendor row model in
    // both directions (a demoted vendor's Vendor record orphans; a promoted
    // staff member has no Vendor record) — not a supported transition.
    if (role === Role.VENDOR) {
      res.status(400).json({ error: 'Users cannot be converted to vendors — vendor accounts are created through vendor self-registration.' });
      return;
    }

    if (id === req.user.id) {
      res.status(400).json({ error: 'You cannot change your own role' });
      return;
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, email: true } });
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (target.role === Role.VENDOR) {
      res.status(400).json({ error: 'Vendor users cannot be converted to staff roles — their vendor company record would be orphaned.' });
      return;
    }

    // Demoting the last active admin would permanently lock the org out of
    // user management, audit logs, and every admin-only action.
    if (target.role === Role.ADMIN && role !== Role.ADMIN) {
      const otherAdmins = await countOtherActiveAdmins(target.id);
      if (otherAdmins === 0) {
        res.status(400).json({ error: 'Cannot demote the last active admin' });
        return;
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'CHANGE_ROLE',
        entity: 'User',
        entityId: id,
        metadata: { email: target.email, from: target.role, to: role },
      },
    });

    res.status(200).json({ user });
  } catch (err) {
    console.error('[updateUserRole]', err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
};

export const deactivateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Only admins can deactivate users' });
      return;
    }
    const { id } = req.params as { id: string };

    if (id === req.user.id) {
      res.status(400).json({ error: 'You cannot deactivate your own account' });
      return;
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, email: true, isActive: true } });
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (target.role === Role.ADMIN && target.isActive) {
      const otherAdmins = await countOtherActiveAdmins(target.id);
      if (otherAdmins === 0) {
        res.status(400).json({ error: 'Cannot deactivate the last active admin' });
        return;
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false, status: UserStatus.INACTIVE },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'DEACTIVATE',
        entity: 'User',
        entityId: id,
        metadata: { email: target.email, role: target.role },
      },
    });

    res.status(200).json({ user });
  } catch (err) {
    console.error('[deactivateUser]', err);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
};
