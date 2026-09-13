import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { errorHandlerMiddleware } from './middleware/error.middleware.js';
import { NotFoundError } from './errors/app.error.js';
import { apiRouter } from './routes/index.js';
import { healthRoutes } from './routes/health.routes.js';
import { API_BASE_PATH } from './constants/index.js';

export const createApp = (): Express => {
  const app = express();

  // Security Headers
  app.use(helmet());

  // CORS Configuration
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(new Error(`CORS origin '${origin}' not allowed.`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    })
  );

  // Cookie Parser
  app.use(cookieParser());

  // Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request ID Middleware
  app.use(requestIdMiddleware);

  // Structured HTTP Request Logging
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as Request).id || req.headers['x-request-id'] || 'unknown',
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    })
  );

  // Unversioned root health probes (commonly targeted by container orchestrators/Render)
  app.use('/health', healthRoutes);

  // Versioned API routes (/api/v1)
  app.use(API_BASE_PATH, apiRouter);

  // 404 Handler - delegates to centralized error handling pipeline
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Cannot ${req.method} ${req.path}`));
  });

  // Centralized Global Error Handler (must be registered last)
  app.use(errorHandlerMiddleware);

  return app;
};
