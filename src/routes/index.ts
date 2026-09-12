import { Router } from 'express';
import { healthRoutes } from './health.routes.js';

const apiRouter = Router();

// Health routes mounted inside versioned API (/api/v1/health)
apiRouter.use('/health', healthRoutes);

export { apiRouter };
