import { Favorite, Asset, AssetSpecification, AssetImage } from '@prisma/client';
import { BaseRepository, PaginatedResult, PaginationOptions } from './base.repository.js';

export type FavoritedAssetWithRelations = Asset & {
  category: {
    id: string;
    name: string;
    slug: string;
    icon: string;
  };
  specification: AssetSpecification | null;
  images: AssetImage[];
  owner: {
    id: string;
    name: string;
    companyName: string | null;
    email: string;
    phone: string | null;
    avatar: string | null;
    verified: boolean;
    rating: number;
    location: string | null;
    createdAt: Date;
  };
};

const ASSET_INCLUDE = {
  category: {
    select: { id: true, name: true, slug: true, icon: true },
  },
  specification: true,
  images: {
    orderBy: { sortOrder: 'asc' as const },
  },
  owner: {
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true,
      phone: true,
      avatar: true,
      verified: true,
      rating: true,
      location: true,
      createdAt: true,
    },
  },
};

export class FavoriteRepository extends BaseRepository {
  /**
   * Idempotently adds an asset to a user's favorites catalog.
   */
  async addFavorite(userId: string, assetId: string): Promise<Favorite> {
    return this.db.favorite.upsert({
      where: {
        uq_user_asset_favorite: {
          userId,
          assetId,
        },
      },
      create: {
        userId,
        assetId,
      },
      update: {},
    });
  }

  /**
   * Idempotently removes an asset from a user's favorites catalog.
   */
  async removeFavorite(userId: string, assetId: string): Promise<number> {
    const result = await this.db.favorite.deleteMany({
      where: {
        userId,
        assetId,
      },
    });
    return result.count;
  }

  /**
   * Fast existence lookup checking if an asset is favorited by a user.
   */
  async isFavorite(userId: string, assetId: string): Promise<boolean> {
    const record = await this.db.favorite.findUnique({
      where: {
        uq_user_asset_favorite: {
          userId,
          assetId,
        },
      },
      select: { id: true },
    });
    return !!record;
  }

  /**
   * Returns a paginated list of favorited assets for a given user.
   */
  async getUserFavorites(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<FavoritedAssetWithRelations>> {
    const { page, limit, skip, take } = this.calculatePagination(options);

    const [favoriteRecords, total] = await Promise.all([
      this.db.favorite.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: {
            include: ASSET_INCLUDE,
          },
        },
      }),
      this.db.favorite.count({ where: { userId } }),
    ]);

    const assets = favoriteRecords.map((f) => f.asset) as unknown as FavoritedAssetWithRelations[];
    return this.formatPaginatedResult(assets, total, page, limit);
  }
}

export const favoriteRepository = new FavoriteRepository();
