import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import contractRoutes from '../src/routes/contracts';
import { prisma } from '../src/config/prisma';

vi.mock('../src/middlewares/authenticate', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    authenticate: (req: any, res: any, next: any) => {
      req.user = { id: 'u1', role: 'VENDOR', email: 'vendor@test.com' };
      next();
    },
  };
});

const app = express();
app.use(express.json());
app.use('/api/v1/contracts', contractRoutes);

describe('Contracts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/contracts', () => {
    it('should block VENDOR from creating contracts (Auth Guard test)', async () => {
      const res = await request(app).post('/api/v1/contracts').send({ title: 'New Contract' });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Access denied');
    });
  });
});
