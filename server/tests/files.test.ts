import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUploadedFile } from '../src/controllers/files';
import { prisma } from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import fs from 'fs';

vi.mock('fs', () => ({
  default: { existsSync: vi.fn().mockReturnValue(true) },
  existsSync: vi.fn().mockReturnValue(true),
}));

vi.mock('jsonwebtoken', () => ({
  default: { verify: vi.fn() },
  verify: vi.fn(),
}));

vi.mock('../src/config/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    invoice: { findFirst: vi.fn() },
    contract: { findFirst: vi.fn() },
  },
}));

const mockRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.sendFile = vi.fn();
  return res;
};

const mockReq = (params: any, opts: { auth?: string; query?: any } = {}) => ({
  params,
  headers: opts.auth ? { authorization: `Bearer ${opts.auth}` } : {},
  query: opts.query ?? {},
});

describe('getUploadedFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fs.existsSync as any).mockReturnValue(true);
  });

  it('rejects with 401 when no token is present at all', async () => {
    const res = mockRes();
    await getUploadedFile(mockReq({ folder: 'invoices', filename: 'a.pdf' }) as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects path traversal attempts with 404 before even checking auth', async () => {
    const res = mockRes();
    await getUploadedFile(mockReq({ folder: 'invoices', filename: '../../etc/passwd' }) as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('accepts a token passed as ?token= query param, not just the header', async () => {
    (jwt.verify as any).mockReturnValue({ userId: 'u-vendor' });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u-vendor', role: 'VENDOR', isActive: true, email: 'v@test.com' });
    (prisma.invoice.findFirst as any).mockResolvedValue({ vendor: { email: 'v@test.com' } });

    const res = mockRes();
    await getUploadedFile(mockReq({ folder: 'invoices', filename: 'a.pdf' }, { query: { token: 'tok' } }) as any, res);
    expect(res.sendFile).toHaveBeenCalled();
  });

  it('blocks a vendor from downloading another vendor\'s invoice PDF', async () => {
    (jwt.verify as any).mockReturnValue({ userId: 'u-vendor' });
    (prisma.user.findUnique as any)
      .mockResolvedValueOnce({ id: 'u-vendor', role: 'VENDOR', isActive: true })
      .mockResolvedValueOnce({ email: 'me@test.com' });
    (prisma.invoice.findFirst as any).mockResolvedValue({ vendor: { email: 'someone-else@test.com' } });

    const res = mockRes();
    await getUploadedFile(mockReq({ folder: 'invoices', filename: 'a.pdf' }, { auth: 'tok' }) as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.sendFile).not.toHaveBeenCalled();
  });

  it('allows FINANCE to download any invoice PDF', async () => {
    (jwt.verify as any).mockReturnValue({ userId: 'u-fin' });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u-fin', role: 'FINANCE', isActive: true });
    (prisma.invoice.findFirst as any).mockResolvedValue({ vendor: { email: 'anyone@test.com' } });

    const res = mockRes();
    await getUploadedFile(mockReq({ folder: 'invoices', filename: 'a.pdf' }, { auth: 'tok' }) as any, res);
    expect(res.sendFile).toHaveBeenCalled();
  });

  it('blocks a VENDOR from browsing the staff-only vendor-documents folder', async () => {
    (jwt.verify as any).mockReturnValue({ userId: 'u-vendor' });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u-vendor', role: 'VENDOR', isActive: true });

    const res = mockRes();
    await getUploadedFile(mockReq({ folder: 'vendors', filename: 'kyc.pdf' }, { auth: 'tok' }) as any, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects a token for a deactivated user', async () => {
    (jwt.verify as any).mockReturnValue({ userId: 'u1' });
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', role: 'ADMIN', isActive: false });

    const res = mockRes();
    await getUploadedFile(mockReq({ folder: 'vendors', filename: 'kyc.pdf' }, { auth: 'tok' }) as any, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
