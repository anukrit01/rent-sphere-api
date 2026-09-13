import { Prisma, PrismaClient } from '@prisma/client';
import { env, isProduction, isDevelopment } from '../config/env.js';
import { logger } from '../utils/logger.js';

const createPrismaClient = () => {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    log: isDevelopment
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
  });

  client.$on('error', (e: Prisma.LogEvent) => {
    logger.error({ target: e.target }, `[Prisma Error]: ${e.message}`);
  });

  client.$on('warn', (e: Prisma.LogEvent) => {
    logger.warn(`[Prisma Warn]: ${e.message}`);
  });

  if (isDevelopment) {
    client.$on('query', (e: Prisma.QueryEvent) => {
      logger.debug({ durationMs: e.duration }, `[Prisma Query]: ${e.query}`);
    });
  }

  return client;
};

type CustomPrismaClient = ReturnType<typeof createPrismaClient>;

declare global {
  // Prevent multiple instances of Prisma Client in development hot-reload
  var __prismaInstance: CustomPrismaClient | undefined;
}

// Singleton Prisma instance
export const prisma = globalThis.__prismaInstance ?? createPrismaClient();

if (!isProduction) {
  globalThis.__prismaInstance = prisma;
}

/**
 * Explicitly connects to the database.
 * Used during application startup to verify connectivity.
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('Database connection established successfully.');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to the PostgreSQL database.');
    throw error;
  }
};

/**
 * Gracefully disconnects the Prisma client.
 * Used during server shutdown.
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected cleanly.');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting from database.');
  }
};
