import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { Server } from 'node:http';

const app = createApp();

const server: Server = app.listen(env.PORT, () => {
  logger.info('=======================================================');
  logger.info(` RentSphere API running in [${env.NODE_ENV}] mode`);
  logger.info(` Server:       http://localhost:${env.PORT}`);
  logger.info(` API Base:     http://localhost:${env.PORT}/api/v1`);
  logger.info(` Health Check: http://localhost:${env.PORT}/health`);
  logger.info('=======================================================');
});

// Graceful Shutdown Handler
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'Error during HTTP server shutdown');
      process.exit(1);
    }
    logger.info('HTTP server closed. Exiting process cleanly.');
    process.exit(0);
  });

  // Force close after 10s if active connections hang
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
