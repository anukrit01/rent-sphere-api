import { AssetImage } from '@prisma/client';
import { BaseRepository } from './base.repository.js';

export interface CreateAssetImageDto {
  url: string;
  publicId: string;
  sortOrder: number;
  isCover: boolean;
}

export class AssetImageRepository extends BaseRepository {
  /**
   * Find single image by primary key ID.
   */
  async findById(imageId: string): Promise<AssetImage | null> {
    return this.db.assetImage.findUnique({
      where: { id: imageId },
    });
  }

  /**
   * Find all images for an asset ordered by sortOrder ascending.
   */
  async findByAssetId(assetId: string): Promise<AssetImage[]> {
    return this.db.assetImage.findMany({
      where: { assetId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Count total images belonging to an asset.
   */
  async countByAssetId(assetId: string): Promise<number> {
    return this.db.assetImage.count({
      where: { assetId },
    });
  }

  /**
   * Create multiple image records for an asset.
   */
  async createMany(assetId: string, items: CreateAssetImageDto[]): Promise<AssetImage[]> {
    const created: AssetImage[] = [];
    for (const item of items) {
      const img = await this.db.assetImage.create({
        data: {
          assetId,
          url: item.url,
          publicId: item.publicId,
          sortOrder: item.sortOrder,
          isCover: item.isCover,
        },
      });
      created.push(img);
    }
    return created;
  }

  /**
   * Designates a specific image as the cover image, atomically demoting all others.
   */
  async setCoverImage(assetId: string, imageId: string): Promise<AssetImage> {
    return this.db.$transaction(async (tx) => {
      // 1. Reset all images for this asset to isCover: false
      await tx.assetImage.updateMany({
        where: { assetId },
        data: { isCover: false },
      });

      // 2. Set target image to isCover: true
      return tx.assetImage.update({
        where: { id: imageId },
        data: { isCover: true },
      });
    });
  }

  /**
   * Delete an image by ID.
   */
  async delete(imageId: string): Promise<AssetImage> {
    return this.db.assetImage.delete({
      where: { id: imageId },
    });
  }

  /**
   * Re-sequence images for an asset in batch.
   */
  async reorder(assetId: string, ordering: Array<{ id: string; sortOrder: number }>): Promise<AssetImage[]> {
    await this.db.$transaction(
      ordering.map((item) =>
        this.db.assetImage.update({
          where: { id: item.id, assetId },
          data: { sortOrder: item.sortOrder },
        })
      )
    );

    return this.findByAssetId(assetId);
  }
}

export const assetImageRepository = new AssetImageRepository();
