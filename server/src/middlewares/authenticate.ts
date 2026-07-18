import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: Role;

  };
}

interface JwtPayload {
  userId: string;
  role: Role;
  is2faPending?: boolean;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Login issues this token before the OTP is checked, valid only for
    // POST /auth/verify-otp (which reads the header itself and never goes
    // through this middleware). Without this check it's a fully-formed
    // Bearer token that authenticate would otherwise accept everywhere else,
    // letting a password alone bypass the second factor entirely.
    if (decoded.is2faPending) {
      res.status(401).json({ error: 'Two-factor verification required' });
      return;
    }

    // Look up current DB state on every request instead of trusting the
    // role/active flag baked into a token that can live up to 7 days —
    // otherwise deactivating a user or changing their role has no effect
    // until their existing token expires. findUnique already excludes
    // soft-deleted users (see config/prisma.ts's extension), so a deleted
    // or deactivated account is rejected the same way here.
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    req.user = {
      id: user.id,
      role: user.role,

    };

    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
