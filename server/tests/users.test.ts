import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import userRoutes from '../src/routes/users';
import { prisma } from '../src/config/prisma';
import { enqueueEmail } from '../src/queues';

vi.mock('../src/middlewares/authenticate', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    authenticate: (req: any, res: any, next: any) => {
      req.user = { id: 'admin1', role: 'ADMIN' };
      next();
    },
  };
});

// Stateful fake for the AuthToken table, mirroring auth.test.ts's pattern -
// hoisted so the vi.mock factory below (which is itself hoisted above all
// other top-level code) can reference it without a TDZ error.
const { mockAuthTokenCreate, mockAuthTokenFindUnique, mockAuthTokenUpdate, resetAuthTokenRows } = vi.hoisted(() => {
  let rows: any[] = [];
  return {
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
    authToken: {
      create: mockAuthTokenCreate,
      findUnique: mockAuthTokenFindUnique,
      update: mockAuthTokenUpdate,
    },
    $transaction: vi.fn((arg: any) => Promise.all(arg)),
  },
}));

vi.mock('../src/queues', () => ({
  enqueueEmail: vi.fn(),
}));

vi.mock('express-rate-limit', () => ({
  default: () => (_req: any, _res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/v1/users', userRoutes);

describe('Users API — invite flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAuthTokenRows();
  });

  const extractInviteToken = () => {
    const html: string = (enqueueEmail as any).mock.calls[0][0].html;
    return html.match(/accept-invite\/([a-f0-9]+)/)![1];
  };

  it('POST /invite creates an INVITED user and emails a real accept-invite link', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({ id: 'u1', email: 'newhire@test.com' });

    const res = await request(app).post('/api/v1/users/invite').send({
      email: 'newhire@test.com', name: 'New Hire', role: 'FINANCE',
    });

    expect(res.status).toBe(201);
    expect(mockAuthTokenCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'u1', purpose: 'INVITE' }),
    }));
    expect(enqueueEmail).toHaveBeenCalledTimes(1);
    expect((enqueueEmail as any).mock.calls[0][0].to).toBe('newhire@test.com');
    expect((enqueueEmail as any).mock.calls[0][0].html).not.toContain('localhost');
  });

  it('GET /accept-invite/:token rejects an unknown token without requiring auth', async () => {
    const res = await request(app).get('/api/v1/users/accept-invite/not-a-real-token');
    expect(res.status).toBe(404);
  });

  it('full flow: invite, look up token, accept, and reuse fails', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({ id: 'u1', email: 'newhire@test.com' });
    await request(app).post('/api/v1/users/invite').send({ email: 'newhire@test.com', name: 'New Hire', role: 'FINANCE' });
    const token = extractInviteToken();

    (prisma.user.findUnique as any).mockResolvedValue({ email: 'newhire@test.com', name: 'New Hire' });
    const lookup = await request(app).get(`/api/v1/users/accept-invite/${token}`);
    expect(lookup.status).toBe(200);
    expect(lookup.body.email).toBe('newhire@test.com');

    (prisma.user.update as any).mockResolvedValue({ id: 'u1' });
    const accept = await request(app).post(`/api/v1/users/accept-invite/${token}`).send({ password: 'newPassword1', name: 'New Hire' });
    expect(accept.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' } }));

    // token is single-use
    const reuse = await request(app).post(`/api/v1/users/accept-invite/${token}`).send({ password: 'anotherPassword2', name: 'New Hire' });
    expect(reuse.status).toBe(404);
  });

  it('POST /accept-invite/:token requires both password and name', async () => {
    const res = await request(app).post('/api/v1/users/accept-invite/some-token').send({ password: 'x' });
    expect(res.status).toBe(400);
  });
});
