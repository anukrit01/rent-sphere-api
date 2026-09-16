import { env, isProduction, isDevelopment, isTest, allowedCorsOrigins } from './env.js';

export const config = {
  server: {
    env: env.NODE_ENV,
    port: env.PORT,
    isProduction,
    isDevelopment,
    isTest,
    corsOrigins: allowedCorsOrigins,
  },
  auth: {
    jwtAccessSecret: env.JWT_ACCESS_SECRET,
    jwtRefreshSecret: env.JWT_REFRESH_SECRET,
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  database: {
    url: env.DATABASE_URL,
  },
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  },
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },
  logging: {
    level: env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  },
} as const;

export type AppConfig = typeof config;
export * from './env.js';
