import { Request, Response } from 'express';
import { assetService, AssetService } from '../services/asset.service.js';
import { asyncHandler } from '../utils/async-handler.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import { AssetQuery, CreateAssetInput, UpdateAssetInput } from '../validators/asset.validator.js';

export class AssetController {
  constructor(private readonly service: AssetService = assetService) {}

  /**
   * GET /api/v1/assets
   * Retrieve public marketplace assets with pagination and filters.
   */
  getAssets = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as AssetQuery;
    const paginated = await this.service.getPublicAssets(query);
    sendPaginated(res, paginated.data, {
      page: paginated.page,
      limit: paginated.limit,
      total: paginated.total,
      totalPages: paginated.totalPages,
      hasNextPage: paginated.hasNextPage,
      hasPreviousPage: paginated.hasPreviousPage,
    });
  });

  /**
   * GET /api/v1/assets/my-assets
   * Retrieve authenticated leaser's asset listings across all statuses.
   */
  getMyAssets = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as AssetQuery;
    const ownerId = req.user!.id;
    const paginated = await this.service.getMyAssets(ownerId, query);
    sendPaginated(res, paginated.data, {
      page: paginated.page,
      limit: paginated.limit,
      total: paginated.total,
      totalPages: paginated.totalPages,
      hasNextPage: paginated.hasNextPage,
      hasPreviousPage: paginated.hasPreviousPage,
    });
  });

  /**
   * GET /api/v1/assets/:id
   * Retrieve asset details with specifications, images, and owner details.
   */
  getAssetById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const asset = await this.service.getAssetById(id, req.user);
    sendSuccess(res, asset);
  });

  /**
   * POST /api/v1/assets
   * Create a new heavy equipment listing (Leaser only).
   */
  createAsset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as CreateAssetInput;
    const ownerId = req.user!.id;
    const asset = await this.service.createAsset(ownerId, dto);
    sendCreated(res, asset);
  });

  /**
   * PATCH /api/v1/assets/:id
   * Update an existing asset listing (Owner or Admin).
   */
  updateAsset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const dto = req.body as UpdateAssetInput;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const asset = await this.service.updateAsset(id, userId, userRole, dto);
    sendSuccess(res, asset);
  });

  /**
   * DELETE /api/v1/assets/:id
   * Delete an existing asset listing (Owner or Admin).
   */
  deleteAsset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    await this.service.deleteAsset(id, userId, userRole);
    sendSuccess(res, null);
  });
}

export const assetController = new AssetController();
