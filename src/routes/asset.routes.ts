import { Router, RequestHandler } from 'express';
import { UserRole } from '@prisma/client';
import { assetController } from '../controllers/asset.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { uuidParamSchema } from '../validators/common.validator.js';
import {
  assetQuerySchema,
  createAssetSchema,
  updateAssetSchema,
} from '../validators/asset.validator.js';
import { verifyAccessToken } from '../utils/token.js';

/**
 * Optional authentication middleware: extracts user claims if a valid Bearer token is passed,
 * but allows unauthenticated requests to pass through cleanly.
 */
const optionalAuthenticate: RequestHandler = (req, _res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) return next();

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
    try {
      const payload = verifyAccessToken(parts[1]);
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      // Ignore token errors for optional authentication
    }
  }
  next();
};

const assetRoutes = Router();

/**
 * Public marketplace listing
 */
assetRoutes.get(
  '/',
  validateRequest({ query: assetQuerySchema }),
  assetController.getAssets
);

/**
 * Protected leaser portal listing
 */
assetRoutes.get(
  '/my-assets',
  authenticate,
  authorize(UserRole.LEASER, UserRole.ADMIN),
  validateRequest({ query: assetQuerySchema }),
  assetController.getMyAssets
);

/**
 * Asset detail with optional authentication (allows owner/admin to preview drafts)
 */
assetRoutes.get(
  '/:id',
  optionalAuthenticate,
  validateRequest({ params: uuidParamSchema }),
  assetController.getAssetById
);

/**
 * Protected creation endpoint (Leasers & Admins)
 */
assetRoutes.post(
  '/',
  authenticate,
  authorize(UserRole.LEASER, UserRole.ADMIN),
  validateRequest({ body: createAssetSchema }),
  assetController.createAsset
);

/**
 * Protected update endpoint (Owner or Admin)
 */
assetRoutes.patch(
  '/:id',
  authenticate,
  authorize(UserRole.LEASER, UserRole.ADMIN),
  validateRequest({ params: uuidParamSchema, body: updateAssetSchema }),
  assetController.updateAsset
);

/**
 * Protected delete endpoint (Owner or Admin)
 */
assetRoutes.delete(
  '/:id',
  authenticate,
  authorize(UserRole.LEASER, UserRole.ADMIN),
  validateRequest({ params: uuidParamSchema }),
  assetController.deleteAsset
);

export { assetRoutes };
