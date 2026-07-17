import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import invoiceRoutes from '../src/routes/invoices';
import { prisma } from '../src/config/prisma';

// Mock auth middleware
vi.mock('../src/middlewares/authenticate', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'u1', role: 'FINANCE', email: 'finance@test.com' };
    next();
  },
  authorize: () => (req: any, res: any, next: any) => next(),
}));

vi.mock('../src/config/prisma', () => ({
  prisma: {
    invoice: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    purchaseOrder: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/v1/invoices', invoiceRoutes);

describe('Invoices API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH /api/v1/invoices/:id/approve', () => {
    it('should fail if invoice is not MATCHED or MISMATCHED', async () => {
      (prisma.invoice.findUnique as any).mockResolvedValue({ id: 'i1', status: 'SUBMITTED', po: {} });

      const res = await request(app).patch('/api/v1/invoices/i1/approve');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Only matched or mismatched invoices can be approved');
    });

    it('should allow FINANCE to force-approve MISMATCHED invoice with reason', async () => {
      (prisma.invoice.findUnique as any).mockResolvedValue({ id: 'i1', status: 'MISMATCHED', po: {} });
      (prisma.invoice.update as any).mockResolvedValue({ id: 'i1', status: 'APPROVED', po: {} });

      const res = await request(app).patch('/api/v1/invoices/i1/approve').send({ reason: 'Approved by CFO' });
      expect(res.status).toBe(200);
      expect(prisma.invoice.update).toHaveBeenCalled();
    });

    it('should fail MISMATCHED approval without reason', async () => {
      (prisma.invoice.findUnique as any).mockResolvedValue({ id: 'i1', status: 'MISMATCHED', po: {} });

      const res = await request(app).patch('/api/v1/invoices/i1/approve').send({ reason: '' });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('A reason is required');
    });
  });

  describe('PATCH /api/v1/invoices/bulk', () => {
    it('should report which selected invoices were skipped and why', async () => {
      (prisma.invoice.findMany as any).mockResolvedValue([
        { id: 'i1', invoiceNumber: 'INV-1', status: 'MATCHED' },
        { id: 'i2', invoiceNumber: 'INV-2', status: 'MISMATCHED' },
      ]);
      (prisma.invoice.updateMany as any).mockResolvedValue({ count: 1 });

      const res = await request(app).patch('/api/v1/invoices/bulk').send({ ids: ['i1', 'i2', 'i3'] });

      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(1);
      expect(res.body.skipped).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'i2', reason: 'status is MISMATCHED, not MATCHED' }),
          expect.objectContaining({ id: 'i3', reason: 'not found' }),
        ])
      );
    });
  });
});
