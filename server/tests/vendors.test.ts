import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import vendorRoutes from '../src/routes/vendors';
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
    vendor: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    auditLog: { create: vi.fn() },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/v1/vendors', vendorRoutes);

describe('Vendors API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/vendors', () => {
    it('should return paginated vendors', async () => {
      (prisma.vendor.findMany as any).mockResolvedValue([{ id: 'v1', companyName: 'Vendor A' }]);
      (prisma.vendor.count as any).mockResolvedValue(1);

      const res = await request(app).get('/api/v1/vendors?page=1&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.vendors.length).toBe(1);
      expect(res.body.total).toBe(1);
    });
  });

  describe('POST /api/v1/vendors', () => {
    it('should create a vendor and log audit', async () => {
      (prisma.vendor.create as any).mockResolvedValue({ id: 'v2', companyName: 'Vendor B' });

      const res = await request(app).post('/api/v1/vendors').send({
        companyName: 'Vendor B',
        contactName: 'John Doe',
        email: 'v@b.com',
        phone: '123',
        address: 'Addr',
        country: 'US',
        industry: 'IT',
        taxId: 'T1'
      });

      expect(res.status).toBe(201);
      expect(res.body.vendor.id).toBe('v2');
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
