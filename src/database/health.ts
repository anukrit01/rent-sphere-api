import { prisma } from './prisma.js';
import { logger } from '../utils/logger.js';

export interface DatabaseHealthResult {
  isHealthy: boolean;
  latencyMs: number;
  error?: string;
}

/**
 * Performs a lightweight health check query (SELECT 1) against PostgreSQL.
 */
export const checkDatabaseHealth = async (): Promise<DatabaseHealthResult> => {
  const start = Date.now();
  try {
    // Execute low-overhead ping query
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return {
      isHealthy: true,
      latencyMs,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const errorMessage = err instanceof Error ? err.message : 'Database ping failed';
    logger.warn({ error: errorMessage, latencyMs }, 'Database health check failed');
    return {
      isHealthy: false,
      latencyMs,
      error: errorMessage,
    };
  }
};
