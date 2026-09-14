import { AssetImage, UserRole } from '@prisma/client';
import { assetImageRepository, AssetImageRepository } from '../repositories/asset-image.repository.js';
import { assetRepository, AssetRepository } from '../repositories/asset.repository.js';
import { cloudinaryService, CloudinaryService } from '../integrations/cloudinary/cloudinary.service.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../errors/app.error.js';

export interface DirectUploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
}

export class AssetImageService {
  constructor(
    private readonly repository: AssetImageRepository = assetImageRepository,
    private readonly assetRepo: AssetRepository = assetRepository,
    private readonly cloudinary: CloudinaryService = cloudinaryService
  ) {}

  /**
   * Upload multiple images for a specific asset with ownership guard.
   */
  async uploadAssetImages(
    assetId: string,
    userId: string,
    userRole: UserRole,
    files: Express.Multer.File[]
  ): Promise<AssetImage[]> {
    if (!files || files.length === 0) {
      throw new BadRequestError('No image files were uploaded');
    }

    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundError(`Equipment listing with ID '${assetId}' not found`);
    }

    // Ownership check: only owning leaser or platform Admin can upload
    if (userRole !== UserRole.ADMIN && asset.ownerId !== userId) {
      throw new ForbiddenError('You do not have permission to upload photos for this equipment listing');
    }

    const existingImages = await this.repository.findByAssetId(assetId);
    const hasExistingImages = existingImages.length > 0;
    let nextSortOrder = hasExistingImages
      ? Math.max(...existingImages.map((i) => i.sortOrder)) + 1
      : 0;

    // Concurrently upload files to Cloudinary
    const uploadPromises = files.map((file) =>
      this.cloudinary.uploadStream(file.buffer, `rentsphere/assets/${assetId}`)
    );
    const uploadResults = await Promise.all(uploadPromises);

    // Prepare records with logical single cover invariant
    const imagePayloads = uploadResults.map((res, index) => {
      const isFirstOfBatch = index === 0;
      const isCover = !hasExistingImages && isFirstOfBatch;
      return {
        url: res.secureUrl,
        publicId: res.publicId,
        sortOrder: nextSortOrder++,
        isCover,
      };
    });

    return this.repository.createMany(assetId, imagePayloads);
  }

  /**
   * Standalone direct upload returning URLs for multi-step listing forms.
   */
  async uploadDirect(files: Express.Multer.File[]): Promise<DirectUploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestError('No image files were uploaded');
    }

    const uploadPromises = files.map((file) =>
      this.cloudinary.uploadStream(file.buffer, 'rentsphere/uploads')
    );
    const results = await Promise.all(uploadPromises);

    return results.map((r) => ({
      url: r.secureUrl,
      publicId: r.publicId,
      format: r.format,
      bytes: r.bytes,
    }));
  }

  /**
   * Delete an image by ID, remove remote Cloudinary asset, and reassign cover if needed.
   */
  async deleteAssetImage(
    assetId: string,
    imageId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundError(`Equipment listing with ID '${assetId}' not found`);
    }

    if (userRole !== UserRole.ADMIN && asset.ownerId !== userId) {
      throw new ForbiddenError('You do not have permission to delete photos from this equipment listing');
    }

    const image = await this.repository.findById(imageId);
    if (!image || image.assetId !== assetId) {
      throw new NotFoundError(`Image with ID '${imageId}' not found for this equipment listing`);
    }

    // 1. Purge remote media from Cloudinary
    await this.cloudinary.deleteMedia(image.publicId);

    // 2. Delete database record
    await this.repository.delete(imageId);

    // 3. Logical cover image reassignment if deleted image was the cover
    if (image.isCover) {
      const remaining = await this.repository.findByAssetId(assetId);
      if (remaining.length > 0 && remaining[0]) {
        // Promote first remaining image to cover
        await this.repository.setCoverImage(assetId, remaining[0].id);
      }
    }
  }

  /**
   * Set specific image as the primary cover photo for the asset.
   */
  async setCoverImage(
    assetId: string,
    imageId: string,
    userId: string,
    userRole: UserRole
  ): Promise<AssetImage> {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundError(`Equipment listing with ID '${assetId}' not found`);
    }

    if (userRole !== UserRole.ADMIN && asset.ownerId !== userId) {
      throw new ForbiddenError('You do not have permission to update photos for this equipment listing');
    }

    const image = await this.repository.findById(imageId);
    if (!image || image.assetId !== assetId) {
      throw new NotFoundError(`Image with ID '${imageId}' not found for this equipment listing`);
    }

    return this.repository.setCoverImage(assetId, imageId);
  }

  /**
   * Re-sequence asset images.
   */
  async reorderImages(
    assetId: string,
    userId: string,
    userRole: UserRole,
    items: Array<{ id: string; sortOrder: number }>
  ): Promise<AssetImage[]> {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundError(`Equipment listing with ID '${assetId}' not found`);
    }

    if (userRole !== UserRole.ADMIN && asset.ownerId !== userId) {
      throw new ForbiddenError('You do not have permission to update photos for this equipment listing');
    }

    return this.repository.reorder(assetId, items);
  }
}

export const assetImageService = new AssetImageService();
