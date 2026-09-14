import { Router, RequestHandler } from 'express';
import { UserRole } from '@prisma/client';
import { assetController } from '../controllers/asset.controller.js';
import { assetImageController } from '../controllers/asset-image.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/authorize.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { uuidParamSchema } from '../validators/common.validator.js';
import {
  assetQuerySchema,
  createAssetSchema,
  updateAssetSchema,
} from '../validators/asset.validator.js';
import {
  reorderImagesSchema,
  assetImageParamsSchema,
} from '../validators/asset-image.validator.js';
import { uploadAssetImages } from '../middleware/upload.middleware.js';
import { verifyAccessToken } from '../utils/token.js';

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
 * Standalone direct image upload (for multi-step listing wizard)
 */
assetRoutes.post(
  '/upload-images',
  authenticate,
  authorize(UserRole.LEASER, UserRole.ADMIN),
  uploadAssetImages,
  assetImageController.uploadDirect
);

/**
 * Image sub-routes attached to asset
 */
assetRoutes.post(
  '/:id/images',
  authenticate,
  authorize(UserRole.LEASER, UserRole.ADMIN),
  validateRequest({ params: uuidParamSchema }),
  uploadAssetImages,
  assetImageController.uploadImages
);

assetRoutes.delete(
  '/:id/images/:imageId',
  authenticate,
  authorize(UserRole.LEASER, UserRole.ADMIN),
  validateRequest({ params: assetImageParamsSchema }),
  assetImageController.deleteImage
);

assetRoutes.patch(
  '/:id/images/:imageId/cover',
  authenticate,
  authorize(UserRole.LEASER, UserRole.ADMIN),
  validateRequest({ params: assetImageParamsSchema }),
  assetImageController.setCoverImage
);

assetRoutes.patch(
  '/:id/images/reorder',
  authenticate,
  authorize(UserRole.LEASER, UserRole.ADMIN),
  validateRequest({ params: uuidParamSchema, body: reorderImagesSchema }),
  assetImageController.reorderImages
);

/**
 * Asset detail with optional authentication
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
