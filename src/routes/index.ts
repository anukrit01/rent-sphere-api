import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';

const apiRouter = Router();

// Health routes mounted inside versioned API (/api/v1/health)
apiRouter.use('/health', healthRoutes);

// Authentication routes (/api/v1/auth)
apiRouter.use('/auth', authRoutes);

export { apiRouter };
