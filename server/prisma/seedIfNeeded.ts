import 'dotenv/config';
import { execSync } from 'child_process';
import { prisma } from '../src/config/prisma';

// Run the full (destructive) seed only when the demo admin is absent — i.e.
// on a fresh database that has never been seeded. On every later deploy this
// is a no-op, so real data accumulated in production survives redeploys.
async function main() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@demo.com' } });
  if (admin) {
    console.log('[seedIfNeeded] Demo admin already exists — skipping seed.');
    return;
  }
  console.log('[seedIfNeeded] Demo admin missing — running full seed...');
  execSync('npx -y tsx prisma/seed.ts', { stdio: 'inherit' });
}

main()
  .catch((err) => {
    console.error('[seedIfNeeded] Failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
