import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { categoryController } from '../controllers/category.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { uuidParamSchema } from '../validators/common.validator.js';
import {
  categoryQuerySchema,
  categoryIdOrSlugParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from '../validators/category.validator.js';

const categoryRoutes = Router();

/**
 * Public category routes
 */
categoryRoutes.get(
  '/',
  validateRequest({ query: categoryQuerySchema }),
  categoryController.getCategories
);

categoryRoutes.get(
  '/:idOrSlug',
  validateRequest({ params: categoryIdOrSlugParamSchema }),
  categoryController.getCategory
);

/**
 * Protected administrative routes
 */
categoryRoutes.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ body: createCategorySchema }),
  categoryController.createCategory
);

categoryRoutes.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: uuidParamSchema, body: updateCategorySchema }),
  categoryController.updateCategory
);

categoryRoutes.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  validateRequest({ params: uuidParamSchema }),
  categoryController.deleteCategory
);

export { categoryRoutes };
