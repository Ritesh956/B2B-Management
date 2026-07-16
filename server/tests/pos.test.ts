import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import posRoutes from '../src/routes/pos';
import { prisma } from '../src/config/prisma';

vi.mock('../src/middlewares/authenticate', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    authenticate: (req: any, res: any, next: any) => {
      req.user = { id: 'u1', role: 'PROCUREMENT', email: 'proc@test.com' };
      next();
    },
  };
});

vi.mock('../src/config/prisma', () => ({
  prisma: {
    purchaseOrder: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    vendor: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/v1/pos', posRoutes);

describe('POs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/pos', () => {
    it('should calculate totalAmount correctly', async () => {
      (prisma.purchaseOrder.findFirst as any).mockResolvedValue(null);
      (prisma.vendor.findUnique as any).mockResolvedValue({ id: 'v1' });
      (prisma.purchaseOrder.create as any).mockResolvedValue({ id: 'p1', totalAmount: 1500 });

      const res = await request(app).post('/api/v1/pos').send({
        vendorId: 'v1',
        title: 'PO 1',
        items: [
          { description: 'Item 1', quantity: 2, unitPrice: 500, taxRate: 0 },
          { description: 'Item 2', quantity: 1, unitPrice: 500, taxRate: 0 }
        ]
      });

      expect(res.status).toBe(201);
      // Ensure the create call received totalAmount = 1500
      expect((prisma.purchaseOrder.create as any).mock.calls[0][0].data.totalAmount).toBe(1500);
    });
  });
});
