import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../database/health.js';

const router = Router();

/**
 * Liveness probe
 * Returns 200 if the Node.js process is responsive.
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    service: 'rent-sphere-api',
  });
});

/**
 * Readiness probe
 * Checks if the application and required backing services (PostgreSQL) are ready to accept traffic.
 */
router.get('/ready', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();

  if (!dbHealth.isHealthy) {
    res.status(503).json({
      status: 'unavailable',
      timestamp: new Date().toISOString(),
      checks: {
        server: 'healthy',
        database: {
          status: 'down',
          latencyMs: dbHealth.latencyMs,
        },
      },
    });
    return;
  }

  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      server: 'healthy',
      database: {
        status: 'up',
        latencyMs: dbHealth.latencyMs,
      },
    },
  });
});

export const healthRoutes = router;
