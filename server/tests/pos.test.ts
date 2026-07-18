import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import posRoutes from '../src/routes/pos';
import { prisma } from '../src/config/prisma';

let mockUser: any = { id: 'u1', role: 'PROCUREMENT', email: 'proc@test.com' };

vi.mock('../src/middlewares/authenticate', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    authenticate: (req: any, res: any, next: any) => {
      req.user = mockUser;
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
      updateMany: vi.fn(),
    },
    vendor: { findUnique: vi.fn() },
    user: { findFirst: vi.fn() },
    auditLog: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../src/queues', () => ({
  enqueueEmail: vi.fn(),
}));

vi.mock('../src/utils/notify', () => ({
  notifyUser: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api/v1/pos', posRoutes);

describe('POs API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 'u1', role: 'PROCUREMENT', email: 'proc@test.com' };
  });

  describe('POST /api/v1/pos/:id/approve', () => {
    const chain600k = {
      steps: [
        { step: 1, role: 'MANAGER', status: 'PENDING', approvedById: null, approvedAt: null },
        { step: 2, role: 'FINANCE', status: 'PENDING', approvedById: null, approvedAt: null },
        { step: 3, role: 'ADMIN', status: 'PENDING', approvedById: null, approvedAt: null },
      ],
      rejectedReason: null, rejectedById: null, rejectedByRole: null, rejectedAt: null,
    };
    const basePO = {
      id: 'po1', poNumber: 'PO-2026-0001', status: 'PENDING_APPROVAL', currentApproverIndex: 0,
      approvalChain: chain600k, createdById: 'creator1',
      vendor: { id: 'v1', companyName: 'Acme', email: 'vendor@test.com' },
      createdBy: { id: 'creator1', name: 'Creator', email: 'creator@test.com', role: 'PROCUREMENT' },
    };

    // approvePO now writes via a guarded updateMany (concurrency check) and
    // re-reads the row — the mock mirrors that with a tiny stateful PO.
    const wireStatefulPO = (initial: any) => {
      let poState = initial;
      (prisma.purchaseOrder.findUnique as any).mockImplementation(() => Promise.resolve(poState));
      (prisma.purchaseOrder.updateMany as any).mockImplementation(({ data }: any) => {
        poState = { ...poState, ...data };
        return Promise.resolve({ count: 1 });
      });
    };

    it('does not crash when the request is sent with no body (regression)', async () => {
      mockUser = { id: 'mgr1', role: 'MANAGER', email: 'mgr@test.com' };
      wireStatefulPO(basePO);

      // No .send() call at all — reproduces the client's real request when no
      // reason is supplied, which previously crashed with "Cannot destructure
      // property 'reason' of 'req.body' as it is undefined."
      const res = await request(app).post('/api/v1/pos/po1/approve');

      expect(res.status).toBe(200);
      expect(res.body.po.status).toBe('PENDING_APPROVAL');
    });

    it('lets ADMIN approve on behalf of the current approver with a reason, and records the override', async () => {
      mockUser = { id: 'admin1', role: 'ADMIN', email: 'admin@test.com' };
      wireStatefulPO(basePO);

      const res = await request(app)
        .post('/api/v1/pos/po1/approve')
        .send({ reason: 'Manager unavailable, approving on their behalf' });

      expect(res.status).toBe(200);
      expect(res.body.po.approvalSteps[0]).toMatchObject({
        status: 'APPROVED',
        overriddenBy: { userId: 'admin1', reason: 'Manager unavailable, approving on their behalf' },
      });
      expect(res.body.po.currentApproverRole).toBe('FINANCE');

      const auditMetadata = (prisma.auditLog.create as any).mock.calls[0][0].data.metadata;
      expect(auditMetadata.overriddenRole).toBe('MANAGER');
    });

    it('returns 409 when the PO state changed between read and write (concurrent approval)', async () => {
      mockUser = { id: 'mgr1', role: 'MANAGER', email: 'mgr@test.com' };
      (prisma.purchaseOrder.findUnique as any).mockResolvedValue(basePO);
      // Guard finds nothing to update — someone else advanced the chain first.
      (prisma.purchaseOrder.updateMany as any).mockResolvedValue({ count: 0 });

      const res = await request(app).post('/api/v1/pos/po1/approve');

      expect(res.status).toBe(409);
    });

    it('rejects an ADMIN override with no reason', async () => {
      mockUser = { id: 'admin1', role: 'ADMIN', email: 'admin@test.com' };
      (prisma.purchaseOrder.findUnique as any).mockResolvedValue(basePO);

      const res = await request(app).post('/api/v1/pos/po1/approve');

      expect(res.status).toBe(400);
      expect(prisma.purchaseOrder.update).not.toHaveBeenCalled();
      expect(prisma.purchaseOrder.updateMany).not.toHaveBeenCalled();
    });
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
