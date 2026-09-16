import { envSchema } from './env.js';

console.log('======================================================================');
console.log(' RentSphere API - Production Environment Configuration Audit');
console.log('======================================================================\n');

// Force evaluation under production mode rules
const prodEnv = {
  ...process.env,
  NODE_ENV: 'production',
};

const result = envSchema.safeParse(prodEnv);

if (!result.success) {
  console.error('✖ Production Configuration Audit FAILED with the following issues:\n');
  result.error.issues.forEach((issue) => {
    const field = issue.path.join('.') || 'root';
    console.error(`  ✖ [${field}]: ${issue.message}`);
  });
  console.error('\n======================================================================');
  console.error(' Remediation Guidance:');
  console.error(' 1. Ensure JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are at least 32 characters');
  console.error('    and do not contain development/demo placeholders.');
  console.error(' 2. Provide a valid Neon / PostgreSQL connection string for DATABASE_URL.');
  console.error(' 3. Set CORS_ORIGIN to your production frontend domain (e.g. https://rentsphere.vercel.app).');
  console.error(' 4. Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set.');
  console.error('======================================================================\n');
  process.exit(1);
}

const maskDbUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return '***';
  }
};

console.log('All production environment constraints verified successfully!\n');
console.log('Summary of active production settings:');
console.log(`  - NODE_ENV:                 ${result.data.NODE_ENV}`);
console.log(`  - PORT:                     ${result.data.PORT}`);
console.log(`  - CORS_ORIGIN:              ${result.data.CORS_ORIGIN}`);
console.log(`  - DATABASE_URL (Pooled):    ${maskDbUrl(result.data.DATABASE_URL)}`);
console.log(`  - DIRECT_URL (Direct):      ${result.data.DIRECT_URL ? maskDbUrl(result.data.DIRECT_URL) : 'Not set (will use DATABASE_URL)'}`);
console.log(`  - JWT_ACCESS_EXPIRES_IN:    ${result.data.JWT_ACCESS_EXPIRES_IN}`);
console.log(`  - JWT_REFRESH_EXPIRES_IN:   ${result.data.JWT_REFRESH_EXPIRES_IN}`);
console.log(`  - CLOUDINARY_CLOUD_NAME:    ${result.data.CLOUDINARY_CLOUD_NAME}`);
console.log(`  - RATE_LIMIT_MAX:           ${result.data.RATE_LIMIT_MAX} requests per ${result.data.RATE_LIMIT_WINDOW_MS / 60000} mins`);
console.log(`  - LOG_LEVEL:                ${result.data.LOG_LEVEL || 'info (default)'}`);
console.log('\n======================================================================');
console.log(' Ready for Render / Cloud Deployment');
console.log('======================================================================\n');
