import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import { Role } from '@prisma/client';

export const authorize = (allowedRoles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'User not authenticated' }); return; }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Access denied: insufficient permissions' }); return;
    }
    next();
  };
};
