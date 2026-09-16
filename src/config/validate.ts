import { validateEnv } from './env.js';

console.log('Validating RentSphere API environment configuration...');
const parsed = validateEnv();
console.log('✔ Environment configuration is valid!');
console.log({
  NODE_ENV: parsed.NODE_ENV,
  PORT: parsed.PORT,
  CORS_ORIGIN: parsed.CORS_ORIGIN,
  DATABASE_URL: parsed.DATABASE_URL.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'),
  JWT_ACCESS_EXPIRES_IN: parsed.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: parsed.JWT_REFRESH_EXPIRES_IN,
  CLOUDINARY_CLOUD_NAME: parsed.CLOUDINARY_CLOUD_NAME,
  RATE_LIMIT_MAX: parsed.RATE_LIMIT_MAX,
});
