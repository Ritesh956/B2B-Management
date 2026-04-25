import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AuthRequest } from '../middlewares/authenticate.js';

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

    let companyId: string | null = null;
    if (companyName && companyAddress) {
      const company = await prisma.company.create({
        data: { name: companyName, address: companyAddress, gstin: gstin ?? null },
      });
      companyId = company.id;
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role,
        companyId,
        notificationPreferences: {
          emailEnabled: true,
          poApprovals: true,
          invoiceUpdates: true,
          contractReminders: true,
        },
      },
      select: { id: true, name: true, email: true, role: true, companyId: true, notificationPreferences: true, createdAt: true },
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

    const secret = process.env.JWT_SECRET || 'secret';
    const token = jwt.sign(
      { userId: user.id, role: user.role, companyId: user.companyId },
      secret,
      { expiresIn: '7d' }
    );

    res.status(200).json({ message: 'Login successful', token });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Internal server error during login' });
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
        companyId: true,
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
          companyId: true,
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
