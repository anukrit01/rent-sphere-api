import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './database/prisma.js';
import { Server } from 'node:http';

const app = createApp();

let server: Server;

const startServer = async () => {
  try {
    // Connect to PostgreSQL (fails gracefully if DB is offline in dev)
    try {
      await connectDatabase();
    } catch {
      logger.warn(
        'Starting server without active database connection (will retry via health checks).'
      );
    }

    server = app.listen(env.PORT, () => {
      logger.info('=======================================================');
      logger.info(` RentSphere API running in [${env.NODE_ENV}] mode`);
      logger.info(` Server:       http://localhost:${env.PORT}`);
      logger.info(` API Base:     http://localhost:${env.PORT}/api/v1`);
      logger.info(` Health Check: http://localhost:${env.PORT}/health`);
      logger.info(` Ready Check:  http://localhost:${env.PORT}/health/ready`);
      logger.info('=======================================================');
    });
  } catch (error) {
    logger.fatal({ error }, 'Fatal error during server startup');
    process.exit(1);
  }
};

// Graceful Shutdown Handler
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async (err) => {
      if (err) {
        logger.error({ err }, 'Error closing HTTP server');
      } else {
        logger.info('HTTP server closed.');
      }

      // Close Prisma database connections
      await disconnectDatabase();
      logger.info('Exiting process cleanly.');
      process.exit(0);
    });
  } else {
    await disconnectDatabase();
    process.exit(0);
  }

  // Force exit after 10s timeout
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout (10s elapsed).');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason: unknown) => {
  logger.error({ reason }, 'Unhandled Rejection detected');
});

process.on('uncaughtException', (error: Error) => {
  logger.fatal({ error }, 'Uncaught Exception detected');
  process.exit(1);
});

startServer();
