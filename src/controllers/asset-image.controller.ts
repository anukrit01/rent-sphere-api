import { Request, Response } from 'express';
import { assetImageService, AssetImageService } from '../services/asset-image.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { ReorderImagesInput } from '../validators/asset-image.validator.js';

export class AssetImageController {
  constructor(private readonly service: AssetImageService = assetImageService) {}

  /**
   * POST /api/v1/assets/:id/images
   * Upload multiple images attached to an existing asset.
   */
  uploadImages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const assetId = req.params.id as string;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const files = (req.files as Express.Multer.File[]) || [];

    const images = await this.service.uploadAssetImages(assetId, userId, userRole, files);
    sendCreated(res, images);
  });

  /**
   * POST /api/v1/assets/upload-images
   * Standalone direct image upload returning public URLs.
   */
  uploadDirect = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const files = (req.files as Express.Multer.File[]) || [];
    const results = await this.service.uploadDirect(files);
    sendCreated(res, results);
  });

  /**
   * DELETE /api/v1/assets/:id/images/:imageId
   * Remove an image from an asset and purge from Cloudinary.
   */
  deleteImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const assetId = req.params.id as string;
    const imageId = req.params.imageId as string;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await this.service.deleteAssetImage(assetId, imageId, userId, userRole);
    sendSuccess(res, null);
  });

  /**
   * PATCH /api/v1/assets/:id/images/:imageId/cover
   * Set specific image as the primary cover photo.
   */
  setCoverImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const assetId = req.params.id as string;
    const imageId = req.params.imageId as string;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const updatedImage = await this.service.setCoverImage(assetId, imageId, userId, userRole);
    sendSuccess(res, updatedImage);
  });

  /**
   * PATCH /api/v1/assets/:id/images/reorder
   * Update gallery display order.
   */
  reorderImages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const assetId = req.params.id as string;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { images } = req.body as ReorderImagesInput;

    const ordered = await this.service.reorderImages(assetId, userId, userRole, images);
    sendSuccess(res, ordered);
  });
}

export const assetImageController = new AssetImageController();
