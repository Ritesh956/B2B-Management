import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../src/routes/auth';
import { prisma } from '../src/config/prisma';

// Mock Prisma
vi.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/v1/auth', authRoutes);

describe('Auth API', () => {
  it('should return 401 for invalid credentials during login', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });
});
