import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AuthRequest } from '../middlewares/authenticate.js';
import { createClient } from 'redis';
import { enqueueEmail } from '../queues/index.js';
import { prisma } from '../config/prisma';

const otpStore = new Map<string, string>();
const redisClient = {
  setEx: async (key: string, _ttl: number, value: string) => { otpStore.set(key, value); },
  get: async (key: string) => otpStore.get(key) ?? null,
  del: async (key: string) => { otpStore.delete(key); },
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, companyName, companyAddress, gstin } = req.body as {
      name: string;
      email: string;
      password: string;
      role: Role;
      companyName?: string;
      companyAddress?: string;
      gstin?: string;
    };

    if (!name || !email || !password || !role) {
      res.status(400).json({ error: 'name, email, password, and role are required' });
      return;
    }

    if (!Object.values(Role).includes(role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${Object.values(Role).join(', ')}` });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);



    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,

        notificationPreferences: {
          emailEnabled: true,
          poApprovals: true,
          invoiceUpdates: true,
          contractReminders: true,
        },
      },
      select: { id: true, name: true, email: true, role: true, notificationPreferences: true, createdAt: true },
    });

    res.status(201).json({ message: 'User registered successfully', user });
  } catch (err) {
    console.error('[register]', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }

    if (user.isTwoFactorEnabled) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
      await redisClient.setEx(`otp:${user.id}`, 300, otp);

      await enqueueEmail({
        to: user.email,
        subject: 'Your Login OTP',
        html: `<p>Your One-Time Password is: <strong>${otp}</strong></p><p>It is valid for 5 minutes.</p>`,
      });

      const secret = process.env.JWT_SECRET || 'secret';
      const tempToken = jwt.sign(
        { userId: user.id, is2faPending: true },
        secret,
        { expiresIn: '5m' }
      );

      res.status(200).json({ requiresOtp: true, tempToken });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const secret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    res.status(200).json({ message: 'Login successful', token });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { otp } = req.body as { otp: string };
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing temp token' });
      return;
    }
    const tempToken = authHeader.split(' ')[1];

    if (!otp) {
      res.status(400).json({ error: 'OTP is required' });
      return;
    }

    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(tempToken, secret) as { userId: string; is2faPending?: boolean };

    if (!decoded.is2faPending) {
      res.status(400).json({ error: 'Invalid token type for OTP verification' });
      return;
    }

    const storedOtp = await redisClient.get(`otp:${decoded.userId}`);
    if (!storedOtp) {
      res.status(400).json({ error: 'OTP expired or invalid' });
      return;
    }

    if (storedOtp !== otp) {
      res.status(400).json({ error: 'Invalid OTP' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User is deactivated or not found' });
      return;
    }

    await redisClient.del(`otp:${decoded.userId}`);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    res.status(200).json({ message: 'Login successful', token });
  } catch (err) {
    console.error('[verifyOtp]', err);
    res.status(401).json({ error: 'Invalid or expired temporary token' });
  }
};

// ─── PATCH /api/auth/2fa/toggle ──────────────────────────────────────────────
export const toggle2fa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { isTwoFactorEnabled } = req.body as { isTwoFactorEnabled: boolean };

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { isTwoFactorEnabled },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isTwoFactorEnabled: true,
      },
    });

    res.status(200).json({ user: updatedUser });
  } catch (err) {
    console.error('[toggle2fa]', err);
    res.status(500).json({ error: 'Failed to toggle 2FA' });
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,

        notificationPreferences: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error('[getMe]', err);
    res.status(500).json({ error: 'Internal server error retrieving profile' });
  }
};

// ─── PATCH /api/auth/me ───────────────────────────────────────────────────────
export const updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { name, email, password, notificationPreferences } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      notificationPreferences?: Record<string, boolean>;
    };

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, role: true },
    });

    if (!currentUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (email && email !== currentUser.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== currentUser.id) {
        res.status(409).json({ error: 'Email already in use' });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (typeof name === 'string' && name.trim()) updateData.name = name.trim();
    if (typeof email === 'string' && email.trim()) updateData.email = email.trim();
    if (typeof password === 'string' && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (notificationPreferences && typeof notificationPreferences === 'object') {
      updateData.notificationPreferences = notificationPreferences;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No changes provided' });
      return;
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: currentUser.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,

          notificationPreferences: true,
          createdAt: true,
        },
      });

      if (currentUser.role === 'VENDOR' && typeof email === 'string' && email.trim()) {
        const vendor = await tx.vendor.findUnique({ where: { email: currentUser.email }, select: { id: true } });
        if (vendor) {
          await tx.vendor.update({ where: { id: vendor.id }, data: { email: email.trim() } });
        }
      }

      return user;
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_PROFILE',
        entity: 'User',
        entityId: req.user.id,
        metadata: {
          updatedFields: Object.keys(updateData),
        },
      },
    });

    res.status(200).json({ user: updatedUser });
  } catch (err) {
    console.error('[updateMe]', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
