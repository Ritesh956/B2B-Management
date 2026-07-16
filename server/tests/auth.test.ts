import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../src/routes/auth';
import { prisma } from '../src/config/prisma';
import bcrypt from 'bcrypt';

vi.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../src/queues', () => ({
  enqueueEmail: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
