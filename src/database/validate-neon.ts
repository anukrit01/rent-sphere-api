import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

console.log('======================================================================');
console.log(' RentSphere API - Database Connectivity & Neon Compatibility Diagnostic');
console.log('======================================================================\n');

const maskUrl = (url?: string): string => {
  if (!url) return 'Not configured';
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '***';
  }
};

console.log('Connection Parameters:');
console.log(`  - Runtime DATABASE_URL (Pooled): ${maskUrl(env.DATABASE_URL)}`);
console.log(`  - Migration DIRECT_URL (Direct): ${maskUrl(env.DIRECT_URL || env.DATABASE_URL)}`);
console.log(`  - Environment:                   ${env.NODE_ENV}\n`);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
});

async function runDiagnostic() {
  const startTime = Date.now();
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    const connectTime = Date.now() - startTime;
    console.log(`✔ Database connection established in ${connectTime}ms.\n`);

    console.log('Executing test query (SELECT version())...');
    const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version();`;
    console.log(`✔ PostgreSQL Version: ${result[0]?.version || 'Unknown'}\n`);

    console.log('Checking database table counts...');
    const [userCount, assetCount, bookingCount, categoryCount] = await Promise.all([
      prisma.user.count(),
      prisma.asset.count(),
      prisma.booking.count(),
      prisma.category.count(),
    ]);

    console.log(`  - Users:      ${userCount}`);
    console.log(`  - Assets:     ${assetCount}`);
    console.log(`  - Bookings:   ${bookingCount}`);
    console.log(`  - Categories: ${categoryCount}\n`);

    console.log('======================================================================');
    console.log('✔ Database diagnostic completed successfully! Connection is healthy.');
    console.log('======================================================================\n');
  } catch (error) {
    console.error('\n✖ Database connection diagnostic FAILED:');
    console.error(error);
    console.error('\n======================================================================');
    console.error(' Troubleshooting Steps:');
    console.error(' 1. Verify DATABASE_URL has ?sslmode=require if connecting to Neon cloud.');
    console.error(' 2. If Neon compute is suspended, allow up to 2-3 seconds for wake-up.');
    console.error(' 3. Ensure IP allowlists (if configured in Neon) permit access from your host.');
    console.error(' 4. Ensure password does not contain unescaped URL special characters.');
    console.error('======================================================================\n');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runDiagnostic();
