import { Router } from 'express';
import { favoriteController } from '../controllers/favorite.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { favoriteQuerySchema } from '../validators/favorite.validator.js';

const userRoutes = Router();

// All user routes require authentication
userRoutes.use(authenticate);

/**
 * GET /api/v1/users/me/favorites
 * Retrieve paginated list of favorited equipment
 */
userRoutes.get(
  '/me/favorites',
  validateRequest({ query: favoriteQuerySchema }),
  favoriteController.getUserFavorites
);

export { userRoutes };
