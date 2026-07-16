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

  const client = baseClient.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          const softDeleteModels = ['User', 'Vendor', 'PurchaseOrder', 'Invoice', 'Contract'];
          if (softDeleteModels.includes(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          const softDeleteModels = ['User', 'Vendor', 'PurchaseOrder', 'Invoice', 'Contract'];
          if (softDeleteModels.includes(model)) {
            args.where = { deletedAt: null, ...args.where };
          }
          return query(args);
        },
        async findUnique({ model, args, query }) {
          const softDeleteModels = ['User', 'Vendor', 'PurchaseOrder', 'Invoice', 'Contract'];
          if (softDeleteModels.includes(model)) {
            // findUnique requires unique fields, so we can't easily add deletedAt: null.
            // But we can filter the result.
            const result = await query(args);
            if (result && (result as any).deletedAt) return null;
            return result;
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
