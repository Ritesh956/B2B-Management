import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../src/routes/auth';
import { prisma } from '../src/config/prisma';
import { enqueueEmail } from '../src/queues';
import bcrypt from 'bcrypt';

// vi.mock factories are hoisted above all other top-level code (including
// `const` declarations that appear earlier in the file), so anything the
// factory below needs must be created through vi.hoisted() rather than a
// plain module-scope const - otherwise it's a TDZ ReferenceError at import
// time. Lightweight stateful fake standing in for the AuthToken table, so
// the password-reset "full flow" test (create -> validate -> use -> reuse
// fails) exercises real create/find/mark-used semantics instead of just
// asserting each mocked call in isolation.
const {
  mockTxUserCreate,
  mockTxVendorCreate,
  mockAuthTokenCreate,
  mockAuthTokenFindUnique,
  mockAuthTokenUpdate,
  resetAuthTokenRows,
} = vi.hoisted(() => {
  let rows: any[] = [];
  return {
    mockTxUserCreate: vi.fn(),
    mockTxVendorCreate: vi.fn(),
    mockAuthTokenCreate: vi.fn(({ data }: any) => {
      const row = { ...data, usedAt: null };
      rows.push(row);
      return Promise.resolve(row);
    }),
    mockAuthTokenFindUnique: vi.fn(({ where }: any) =>
      Promise.resolve(rows.find((r) => r.token === where.token) ?? null)
    ),
    mockAuthTokenUpdate: vi.fn(({ where, data }: any) => {
      const row = rows.find((r) => r.token === where.token);
      if (row) Object.assign(row, data);
      return Promise.resolve(row);
    }),
    resetAuthTokenRows: () => { rows = []; },
  };
});

vi.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    vendor: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    authToken: {
      create: mockAuthTokenCreate,
      findUnique: mockAuthTokenFindUnique,
      update: mockAuthTokenUpdate,
    },
    $transaction: vi.fn((arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg({
      user: { create: mockTxUserCreate },
      vendor: { create: mockTxVendorCreate },
    }))),
  },
}));

vi.mock('../src/queues', () => ({
  enqueueEmail: vi.fn(),
}));

// The credential rate limiter is shared across register/login/forgot-password/
// reset-password by design (see routes/auth.ts). That's the right call in
// production, but this file alone makes more than its 10-per-window budget
// worth of requests against it, so tests would start 429ing each other out.
// Rate-limiting itself isn't what these tests exercise, so stub it out here.
vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthTokenRows();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should reject self-registration for staff roles', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Eve',
        email: 'eve@test.com',
        password: 'password123',
        role: 'ADMIN',
      });
      expect(res.status).toBe(403);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('should reject vendor registration missing companyName/phone', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Eve',
        email: 'eve@test.com',
        password: 'password123',
        role: 'VENDOR',
      });
      expect(res.status).toBe(400);
      expect(mockTxUserCreate).not.toHaveBeenCalled();
    });

    it('should allow self-registration for the vendor role and create a matching Vendor row', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.vendor.findUnique as any).mockResolvedValue(null);
      mockTxUserCreate.mockResolvedValue({
        id: '1', name: 'Eve', email: 'eve@test.com', role: 'VENDOR', notificationPreferences: {}, createdAt: new Date(),
      });
      mockTxVendorCreate.mockResolvedValue({ id: 'v1' });

      const res = await request(app).post('/api/v1/auth/register').send({
        name: 'Eve',
        email: 'eve@test.com',
        password: 'password123',
        role: 'VENDOR',
        companyName: 'Eve Co',
        phone: '+919900000000',
      });
      expect(res.status).toBe(201);
      expect(mockTxUserCreate).toHaveBeenCalled();
      expect(mockTxVendorCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ companyName: 'Eve Co', contactName: 'Eve', email: 'eve@test.com', phone: '+919900000000' }),
      }));
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 401 for invalid email', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      const res = await request(app).post('/api/v1/auth/login').send({ email: 'test@test.com', password: 'pw' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 401 for wrong password', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ password: await bcrypt.hash('correct', 10), isActive: true, role: 'VENDOR' });
      const res = await request(app).post('/api/v1/auth/login').send({ email: 'test@test.com', password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return 403 for deactivated user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ password: await bcrypt.hash('pw', 10), isActive: false, role: 'VENDOR' });
      const res = await request(app).post('/api/v1/auth/login').send({ email: 'test@test.com', password: 'pw' });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Account is deactivated');
    });
  });

  describe('Password reset flow', () => {
    const extractToken = () => {
      const html: string = (enqueueEmail as any).mock.calls[0][0].html;
      return html.match(/reset-password\/([a-f0-9]+)/)![1];
    };

    it('POST /forgot-password returns a generic message and does not enqueue an email for an unknown address', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'nobody@test.com' });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/if an account exists/i);
      expect(enqueueEmail).not.toHaveBeenCalled();
    });

    it('POST /forgot-password issues a reset token and emails it for a known active user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', email: 'jane@test.com', isActive: true });
      const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'jane@test.com' });
      expect(res.status).toBe(200);
      expect(enqueueEmail).toHaveBeenCalledTimes(1);
      expect((enqueueEmail as any).mock.calls[0][0].to).toBe('jane@test.com');
    });

    it('GET /reset-password/:token rejects an unknown token', async () => {
      const res = await request(app).get('/api/v1/auth/reset-password/not-a-real-token');
      expect(res.status).toBe(404);
    });

    it('full flow: request link, validate token, set new password, and reuse fails', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', email: 'jane@test.com', isActive: true });
      await request(app).post('/api/v1/auth/forgot-password').send({ email: 'jane@test.com' });
      const token = extractToken();

      const validate = await request(app).get(`/api/v1/auth/reset-password/${token}`);
      expect(validate.status).toBe(200);

      (prisma.user.update as any).mockResolvedValue({ id: 'u1' });
      const reset = await request(app).post(`/api/v1/auth/reset-password/${token}`).send({ password: 'brandNewPassword1' });
      expect(reset.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' } }));

      // token is single-use
      const reuse = await request(app).post(`/api/v1/auth/reset-password/${token}`).send({ password: 'anotherPassword2' });
      expect(reuse.status).toBe(404);
    });

    it('POST /reset-password/:token rejects a password under 8 characters', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', email: 'jane@test.com', isActive: true });
      await request(app).post('/api/v1/auth/forgot-password').send({ email: 'jane@test.com' });
      const token = extractToken();

      const res = await request(app).post(`/api/v1/auth/reset-password/${token}`).send({ password: 'short' });
      expect(res.status).toBe(400);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
