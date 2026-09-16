import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1024).max(65535).default(3000),
    CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN cannot be empty').default('http://localhost:4200'),

    // Database Connection String
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .refine(
        (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
        'DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://'
      )
      .default('postgresql://postgres:postgres@localhost:5432/rentsphere_db?schema=public'),

    // Direct Database Connection for Prisma CLI migrations
    DIRECT_URL: z
      .string()
      .refine(
        (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
        'DIRECT_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://'
      )
      .optional(),

    // Authentication Secrets (Minimum 32 characters for security)
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long for security')
      .default('development_jwt_access_secret_key_32_characters_minimum_len!'),
    JWT_REFRESH_SECRET: z
      .string()
      .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long for security')
      .default('development_jwt_refresh_secret_key_32_characters_minimum_len!'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    // Media Storage (Cloudinary)
    CLOUDINARY_CLOUD_NAME: z.string().min(1).default('demo'),
    CLOUDINARY_API_KEY: z.string().min(1).default('000000000000000'),
    CLOUDINARY_API_SECRET: z.string().min(1).default('000000000000000000000000000'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

    // Logging
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).optional(),

    // Optional Integrations
    EMAIL_PROVIDER: z.string().optional(),
    EMAIL_API_KEY: z.string().optional(),
  })
  .refine((data) => data.JWT_ACCESS_SECRET !== data.JWT_REFRESH_SECRET, {
    message:
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be distinct keys to prevent token forgery',
    path: ['JWT_REFRESH_SECRET'],
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        const isDefaultSecret = (secret: string) =>
          secret.includes('development_') || secret.includes('demo') || secret.includes('0000');
        if (isDefaultSecret(data.JWT_ACCESS_SECRET) || isDefaultSecret(data.JWT_REFRESH_SECRET)) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'In production mode, default development secrets are strictly prohibited',
      path: ['JWT_ACCESS_SECRET'],
    }
  );

export type EnvSchema = z.infer<typeof envSchema>;

const formatZodIssues = (issues: z.ZodIssue[]): string => {
  return issues
    .map((issue) => {
      const field = issue.path.join('.') || 'root';
      return `  ✖ [${field}]: ${issue.message}`;
    })
    .join('\n');
};

export const validateEnv = (rawEnv: NodeJS.ProcessEnv = process.env): EnvSchema => {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const formatted = formatZodIssues(result.error.issues);
    console.error('\n' + '='.repeat(70));
    console.error(' [FATAL] Environment Configuration Validation Failed');
    console.error('='.repeat(70));
    console.error(formatted);
    console.error('='.repeat(70));
    console.error(
      ' The application cannot start safely. Check your .env file or deployment config.\n'
    );
    process.exit(1);
  }

  return result.data;
};

export const env = validateEnv();
export type EnvConfig = typeof env;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

export const allowedCorsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
