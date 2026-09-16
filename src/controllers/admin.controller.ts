import { Request, Response } from 'express';
import { adminService, AdminService } from '../services/admin.service.js';
import { sendSuccess, sendPaginated } from '../utils/response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AuthUser } from '../middleware/auth.middleware.js';
import {
  AdminUsersQueryInput,
  UpdateUserStatusInput,
  AdminAssetActionInput,
  AdminBookingsQueryInput,
} from '../validators/admin.validator.js';
import { PaginationOptions } from '../repositories/base.repository.js';

export class AdminController {
  constructor(private readonly service: AdminService = adminService) {}

  /**
   * GET /api/v1/admin/dashboard
   */
  getDashboard = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const metrics = await this.service.getDashboardMetrics();
    sendSuccess(res, metrics, 200, { message: 'Admin dashboard aggregates retrieved successfully' });
  });

  /**
   * GET /api/v1/admin/users
   */
  getUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as AdminUsersQueryInput;
    const paginated = await this.service.getUsers(query);
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
   * PATCH /api/v1/admin/users/:id/status
   */
  updateUserStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const adminUser = req.user as AuthUser;
    const targetUserId = req.params.id as string;
    const input = req.body as UpdateUserStatusInput;
    const updated = await this.service.updateUserStatus(adminUser.id, targetUserId, input);
    sendSuccess(res, updated, 200, { message: 'User status updated successfully' });
  });

  /**
   * GET /api/v1/admin/assets/pending
   */
  getPendingAssets = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as PaginationOptions;
    const paginated = await this.service.getPendingAssets(query);
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
   * PATCH /api/v1/admin/assets/:id/approve
   */
  approveAsset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const adminUser = req.user as AuthUser;
    const assetId = req.params.id as string;
    const approved = await this.service.approveAsset(adminUser.id, assetId);
    sendSuccess(res, approved, 200, { message: 'Equipment approved successfully' });
  });

  /**
   * PATCH /api/v1/admin/assets/:id/reject
   */
  rejectAsset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const adminUser = req.user as AuthUser;
    const assetId = req.params.id as string;
    const input = req.body as AdminAssetActionInput;
    const rejected = await this.service.rejectAsset(adminUser.id, assetId, input);
    sendSuccess(res, rejected, 200, { message: 'Equipment rejected successfully' });
  });

  /**
   * GET /api/v1/admin/bookings
   */
  getAllBookings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as AdminBookingsQueryInput;
    const paginated = await this.service.getAllBookings(query);
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

export const adminController = new AdminController();
