import { favoriteRepository, FavoriteRepository } from '../repositories/favorite.repository.js';
import { assetRepository, AssetRepository, AssetWithRelations } from '../repositories/asset.repository.js';
import { assetService, AssetService, FormattedAsset } from './asset.service.js';
import { NotFoundError } from '../errors/app.error.js';
import { PaginatedResult } from '../repositories/base.repository.js';
import { FavoriteQueryInput } from '../validators/favorite.validator.js';

export class FavoriteService {
  constructor(
    private readonly favoriteRepo: FavoriteRepository = favoriteRepository,
    private readonly assetRepo: AssetRepository = assetRepository,
    private readonly assetSvc: AssetService = assetService
  ) {}

  /**
   * Bookmarks an asset to the user's favorites list.
   */
  async addFavorite(userId: string, assetId: string) {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundError('Equipment listing not found');
    }

    await this.favoriteRepo.addFavorite(userId, assetId);

    return {
      assetId,
      isFavorite: true,
    };
  }

  /**
   * Removes an asset from the user's favorites list.
   */
  async removeFavorite(userId: string, assetId: string) {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundError('Equipment listing not found');
    }

    await this.favoriteRepo.removeFavorite(userId, assetId);

    return {
      assetId,
      isFavorite: false,
    };
  }

  /**
   * Checks whether the specified asset is currently favorited by the user.
   */
  async checkFavoriteStatus(userId: string, assetId: string) {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundError('Equipment listing not found');
    }

    const isFav = await this.favoriteRepo.isFavorite(userId, assetId);

    return {
      assetId,
      isFavorite: isFav,
    };
  }

  /**
   * Retrieves paginated list of favorited equipment for the user.
   */
  async getUserFavorites(userId: string, query: FavoriteQueryInput): Promise<PaginatedResult<FormattedAsset>> {
    const result = await this.favoriteRepo.getUserFavorites(userId, {
      page: query.page,
      limit: query.limit,
    });

    return {
      ...result,
      data: result.data.map((asset) => this.assetSvc.formatAsset(asset as unknown as AssetWithRelations)),
    };
  }
}

export const favoriteService = new FavoriteService();
