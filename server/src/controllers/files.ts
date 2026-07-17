import { Response } from 'express';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/authenticate';

const uploadsRoot = path.join(process.cwd(), 'uploads');
const STAFF_ROLES: Role[] = [Role.ADMIN, Role.PROCUREMENT, Role.MANAGER, Role.FINANCE];

// Uploaded PDFs/documents used to be served by express.static with no auth
// at all - anyone with (or guessing) a URL could read any invoice/contract/
// vendor-document PDF. This replaces it with an authenticated, ownership-
// checked handler.
//
// The client renders these as plain <a href>/<iframe src> (PDF preview and
// direct-download links), which can't attach an Authorization header, so
// this also accepts the session token as a ?token= query param as a
// fallback. That does mean the token can end up in browser history/server
// access logs for these specific requests - a real tradeoff, but a smaller
// exposure than the completely unauthenticated status quo it replaces.
const resolveUser = async (req: AuthRequest): Promise<{ id: string; role: Role } | null> => {
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  const token = headerToken || (req.query.token as string | undefined);
  if (!token) return null;

  try {
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret) as { userId: string; is2faPending?: boolean };
    if (decoded.is2faPending) return null;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) return null;

    return { id: user.id, role: user.role };
  } catch {
    return null;
  }
};

const streamFile = (res: Response, absolutePath: string) => {
  res.sendFile(absolutePath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: 'File not found' });
    }
  });
};

export const getUploadedFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { folder, filename } = req.params as { folder: string; filename: string };

    // Reject path traversal / anything outside the three known folders up
    // front - filename must be exactly the multer-generated basename.
    if (!/^[a-z0-9]+$/i.test(folder) || filename !== path.basename(filename)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const absolutePath = path.join(uploadsRoot, folder, filename);
    if (!absolutePath.startsWith(uploadsRoot) || !fs.existsSync(absolutePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    const user = await resolveUser(req);
    if (!user) {
      res.status(401).json({ error: 'Missing or invalid authorization' });
      return;
    }

    if (folder === 'vendors') {
      // Vendor onboarding documents (KYC/MSME etc.) are staff-only, same as
      // the rest of the vendor directory (GET /api/v1/vendors) - a vendor
      // manages their own record through /api/v1/vendor/profile, not here.
      if (!STAFF_ROLES.includes(user.role)) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      streamFile(res, absolutePath);
      return;
    }

    if (folder === 'invoices') {
      const invoice = await prisma.invoice.findFirst({
        where: { fileUrl: { endsWith: `/invoices/${filename}` } },
        include: { vendor: { select: { email: true } } },
      });
      if (!invoice) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      const allowed = user.role === Role.ADMIN || user.role === Role.FINANCE
        || (user.role === Role.VENDOR && await isOwnVendorEmail(user.id, invoice.vendor.email));
      if (!allowed) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      streamFile(res, absolutePath);
      return;
    }

    if (folder === 'contracts') {
      const contract = await prisma.contract.findFirst({
        where: { fileUrl: { endsWith: `/contracts/${filename}` } },
        include: { vendor: { select: { email: true } } },
      });
      if (!contract) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      const allowed = STAFF_ROLES.includes(user.role)
        || (user.role === Role.VENDOR && await isOwnVendorEmail(user.id, contract.vendor.email));
      if (!allowed) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
      streamFile(res, absolutePath);
      return;
    }

    res.status(404).json({ error: 'File not found' });
  } catch (err) {
    console.error('[getUploadedFile]', err);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
};

const isOwnVendorEmail = async (userId: string, vendorEmail: string): Promise<boolean> => {
  const requester = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return requester?.email === vendorEmail;
};
