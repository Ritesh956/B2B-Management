import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Role, AuthTokenPurpose } from '@prisma/client';
import { AuthRequest } from '../middlewares/authenticate.js';
import { enqueueEmail } from '../queues/index.js';
import { prisma } from '../config/prisma';

const otpStore = new Map<string, string>();
const redisClient = {
  setEx: async (key: string, _ttl: number, value: string) => { otpStore.set(key, value); },
  get: async (key: string) => otpStore.get(key) ?? null,
  del: async (key: string) => { otpStore.delete(key); },
};

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
// Falls back to the deployed client's actual domain rather than localhost —
// a reset/invite link built from localhost is dead on arrival for every
// real user, which is exactly what was happening before this fell back
// correctly.
const clientUrl = (process.env.CLIENT_URL || 'https://rit-vendor.vercel.app').replace(/\/$/, '');

// ─── POST /api/auth/register ──────────────────────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, companyName, phone } = req.body as {
      name: string;
      email: string;
      password: string;
      role: Role;
      companyName?: string;
      phone?: string;
    };

    if (!name || !email || !password || !role) {
      res.status(400).json({ error: 'name, email, password, and role are required' });
      return;
    }

    if (!Object.values(Role).includes(role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${Object.values(Role).join(', ')}` });
      return;
    }

    if (role !== Role.VENDOR) {
      res.status(403).json({ error: 'Self-registration is only available for vendor accounts. Staff accounts must be created by an administrator from User Management.' });
      return;
    }

    if (!companyName || !phone) {
      res.status(400).json({ error: 'companyName and phone are required for vendor registration' });
      return;
    }

    const [existingUser, existingVendor] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.vendor.findUnique({ where: { email } }),
    ]);
    if (existingUser) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }
    if (existingVendor) {
      res.status(409).json({ error: 'A vendor with this email already exists' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);

    // Vendor↔User are linked by email, not a foreign key (see CLAUDE.md) — a
    // VENDOR user with no matching Vendor row can log in but every vendor
    // portal endpoint 404s ("Vendor profile not found"). Create both in one
    // transaction so a self-registered vendor account is actually usable.
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
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

      await tx.vendor.create({
        data: {
          companyName,
          contactName: name,
          email,
          phone,
        },
      });

      return createdUser;
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
        isTwoFactorEnabled: true,
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
          isTwoFactorEnabled: true,
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

// ─── POST /api/auth/forgot-password ───────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email: string };
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Only issue a token for real, active accounts, but always send back the
    // same response either way so this endpoint can't be used to enumerate
    // which emails have an account.
    if (user && user.isActive) {
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.authToken.create({
        data: {
          token,
          userId: user.id,
          purpose: AuthTokenPurpose.PASSWORD_RESET,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const resetLink = `${clientUrl}/reset-password/${token}`;

      await enqueueEmail({
        to: user.email,
        subject: 'Reset your VendorHub password',
        html: `<p>We received a request to reset your password. This link expires in 30 minutes:</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
      });
    }

    res.status(200).json({ message: 'If an account exists for that email, a reset link has been sent.' });
  } catch (err) {
    console.error('[forgotPassword]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── GET /api/auth/reset-password/:token ──────────────────────────────────────
export const validateResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params as { token: string };
    const entry = await prisma.authToken.findUnique({ where: { token } });

    if (!entry || entry.purpose !== AuthTokenPurpose.PASSWORD_RESET || entry.usedAt || entry.expiresAt < new Date()) {
      res.status(404).json({ error: 'This reset link is invalid or has expired' });
      return;
    }

    res.status(200).json({ valid: true });
  } catch (err) {
    console.error('[validateResetToken]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ─── POST /api/auth/reset-password/:token ─────────────────────────────────────
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params as { token: string };
    const { password } = req.body as { password: string };

    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const entry = await prisma.authToken.findUnique({ where: { token } });
    if (!entry || entry.purpose !== AuthTokenPurpose.PASSWORD_RESET || entry.usedAt || entry.expiresAt < new Date()) {
      res.status(404).json({ error: 'This reset link is invalid or has expired' });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: entry.userId }, data: { password: hashed } }),
      prisma.authToken.update({ where: { token }, data: { usedAt: new Date() } }),
    ]);

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('[resetPassword]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
