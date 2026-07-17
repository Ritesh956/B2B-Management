import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import searchRoutes from '../src/routes/search';
import { prisma } from '../src/config/prisma';

let mockUser: any = { id: 'admin1', role: 'ADMIN', email: 'admin@test.com' };

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
    vendor: { findMany: vi.fn() },
    purchaseOrder: { findMany: vi.fn() },
    invoice: { findMany: vi.fn() },
    contract: { findMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/v1/search', searchRoutes);

const emptyMocks = () => {
  (prisma.vendor.findMany as any).mockResolvedValue([]);
  (prisma.purchaseOrder.findMany as any).mockResolvedValue([]);
  (prisma.invoice.findMany as any).mockResolvedValue([]);
  (prisma.contract.findMany as any).mockResolvedValue([]);
};

describe('GET /api/v1/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 'admin1', role: 'ADMIN', email: 'admin@test.com' };
    emptyMocks();
  });

  it('matches purchase orders, invoices, and contracts by vendor company name, not just their own number/title', async () => {
    const res = await request(app).get('/api/v1/search').query({ q: 'Alpha' });

    expect(res.status).toBe(200);

    const poWhere = (prisma.purchaseOrder.findMany as any).mock.calls[0][0].where;
    expect(poWhere.OR).toEqual(
      expect.arrayContaining([
        { poNumber: { contains: 'Alpha', mode: 'insensitive' } },
        { vendor: { companyName: { contains: 'Alpha', mode: 'insensitive' } } },
      ])
    );

    const invoiceWhere = (prisma.invoice.findMany as any).mock.calls[0][0].where;
    expect(invoiceWhere.OR).toEqual(
      expect.arrayContaining([
        { invoiceNumber: { contains: 'Alpha', mode: 'insensitive' } },
        { vendor: { companyName: { contains: 'Alpha', mode: 'insensitive' } } },
      ])
    );

    const contractWhere = (prisma.contract.findMany as any).mock.calls[0][0].where;
    expect(contractWhere.OR).toEqual(
      expect.arrayContaining([
        { title: { contains: 'Alpha', mode: 'insensitive' } },
        { vendor: { companyName: { contains: 'Alpha', mode: 'insensitive' } } },
      ])
    );
  });

  it('still scopes PO results to the vendor themself, alongside the OR match', async () => {
    mockUser = { id: 'vendorUser1', role: 'VENDOR', email: 'vendor@test.com' };
    (prisma.user.findUnique as any).mockResolvedValue({ email: 'vendor@test.com' });

    await request(app).get('/api/v1/search').query({ q: 'Alpha' });

    const poWhere = (prisma.purchaseOrder.findMany as any).mock.calls[0][0].where;
    expect(poWhere.vendor).toEqual({ email: 'vendor@test.com' });
    expect(poWhere.OR).toBeDefined();
  });

  it('still scopes PO results to the creator for PROCUREMENT', async () => {
    mockUser = { id: 'proc1', role: 'PROCUREMENT', email: 'proc@test.com' };

    await request(app).get('/api/v1/search').query({ q: 'Alpha' });

    const poWhere = (prisma.purchaseOrder.findMany as any).mock.calls[0][0].where;
    expect(poWhere.createdById).toBe('proc1');
    expect(poWhere.OR).toBeDefined();
  });

  it('returns empty result sets for a query shorter than 2 characters without hitting the database', async () => {
    const res = await request(app).get('/api/v1/search').query({ q: 'a' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ vendors: [], purchaseOrders: [], invoices: [], contracts: [] });
    expect(prisma.vendor.findMany).not.toHaveBeenCalled();
  });
});
