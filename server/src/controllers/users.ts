import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';
import { Role, UserStatus, AuthTokenPurpose } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { enqueueEmail } from '../queues';

const INVITE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const clientUrl = (process.env.CLIENT_URL || 'https://rit-vendor.vercel.app').replace(/\/$/, '');

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

export const inviteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== Role.ADMIN) {
      res.status(403).json({ error: 'Only admins can invite users' });
      return;
    }
    const { email, role, name } = req.body;
    if (!email || !role || !name) {
      res.status(400).json({ error: 'Email, name, and role are required' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: 'User already exists' });
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

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.authToken.create({
      data: {
        token,
        userId: user.id,
        purpose: AuthTokenPurpose.INVITE,
        expiresAt: new Date(Date.now() + INVITE_TOKEN_TTL_MS),
      },
    });

    const inviteLink = `${clientUrl}/accept-invite/${token}`;
    await enqueueEmail({
      to: user.email,
      subject: 'You\'ve been invited to VendorHub',
      html: `<p>An administrator invited you to join VendorHub as ${role}. This link expires in 24 hours:</p><p><a href="${inviteLink}">${inviteLink}</a></p>`,
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
    const { role } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { role },
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

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false, status: UserStatus.INACTIVE },
    });
    res.status(200).json({ user });
  } catch (err) {
    console.error('[deactivateUser]', err);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
};
