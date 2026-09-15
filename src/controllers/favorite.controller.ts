import { Request, Response } from 'express';
import { favoriteService, FavoriteService } from '../services/favorite.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AuthUser } from '../middleware/auth.middleware.js';
import { FavoriteQueryInput } from '../validators/favorite.validator.js';

export class FavoriteController {
  constructor(private readonly service: FavoriteService = favoriteService) {}

  /**
   * POST /api/v1/assets/:id/favorite
   */
  addFavorite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const assetId = req.params.id as string;
    const result = await this.service.addFavorite(user.id, assetId);
    sendCreated(res, result, { message: 'Asset added to favorites successfully' });
  });

  /**
   * DELETE /api/v1/assets/:id/favorite
   */
  removeFavorite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const assetId = req.params.id as string;
    const result = await this.service.removeFavorite(user.id, assetId);
    sendSuccess(res, result, 200, { message: 'Asset removed from favorites successfully' });
  });

  /**
   * GET /api/v1/assets/:id/favorite
   */
  checkFavoriteStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const assetId = req.params.id as string;
    const result = await this.service.checkFavoriteStatus(user.id, assetId);
    sendSuccess(res, result, 200);
  });

  /**
   * GET /api/v1/users/me/favorites
   */
  getUserFavorites = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const query = req.query as unknown as FavoriteQueryInput;
    const paginated = await this.service.getUserFavorites(user.id, query);
    sendPaginated(res, paginated.data, {
      page: paginated.page,
      limit: paginated.limit,
      total: paginated.total,
      totalPages: paginated.totalPages,
      hasNextPage: paginated.hasNextPage,
      hasPreviousPage: paginated.hasPreviousPage,
    });
  });
}

export const favoriteController = new FavoriteController();
