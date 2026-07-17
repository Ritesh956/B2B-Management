import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof makePrisma>;
};

function makePrisma() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const adapter = new PrismaPg({ connectionString });

  const baseClient = new PrismaClient({ adapter });

  const SOFT_DELETE_MODELS = ['User', 'Vendor', 'PurchaseOrder', 'Invoice', 'Contract'];

  const client = baseClient.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model)) {
            // findUnique requires unique fields, so we can't easily add deletedAt: null.
            // But we can filter the result.
            const result = await query(args);
            if (result && (result as any).deletedAt) return null;
            return result;
          }
          return query(args);
        },
        // count/groupBy/aggregate were missing from the original soft-delete
        // filter, so a soft-deleted row still counted toward pagination
        // totals, dashboard stats, and report numbers even though it was
        // invisible in every list/detail view.
        async count({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
        async groupBy({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model)) {
            (args as any).where = { deletedAt: null, ...(args as any).where };
          }
          return query(args);
        },
        async aggregate({ model, args, query }) {
          if (SOFT_DELETE_MODELS.includes(model)) {
            (args as any).where = { deletedAt: null, ...(args as any).where };
          }
          return query(args);
        },
      },
    },
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? makePrisma();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
