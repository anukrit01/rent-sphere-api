import { User, AssetStatus, NotificationType, AuditAction } from '@prisma/client';
import { adminRepository, AdminRepository, DashboardMetrics } from '../repositories/admin.repository.js';
import { notificationService, NotificationService } from './notification.service.js';
import { auditLogService, AuditLogService } from './audit-log.service.js';
import {
  AdminUsersQueryInput,
  UpdateUserStatusInput,
  AdminAssetActionInput,
  AdminBookingsQueryInput,
} from '../validators/admin.validator.js';
import { NotFoundError, BadRequestError } from '../errors/app.error.js';
import { PaginatedResult, PaginationOptions } from '../repositories/base.repository.js';
import { excludeFieldsMany, excludeFields } from '../utils/response.js';
import { FormattedAsset, AssetService, assetService as defaultAssetService } from './asset.service.js';
import { FormattedBooking, BookingService, bookingService as defaultBookingService } from './booking.service.js';

export type SanitizedAdminUser = Omit<User, 'password'>;

export class AdminService {
  constructor(
    private readonly adminRepo: AdminRepository = adminRepository,
    private readonly notifService: NotificationService = notificationService,
    private readonly assetService: AssetService = defaultAssetService,
    private readonly bookingService: BookingService = defaultBookingService,
    private readonly auditService: AuditLogService = auditLogService
  ) {}

  /**
   * Retrieves aggregated dashboard metrics across the entire platform.
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.adminRepo.getDashboardMetrics();
  }

  /**
   * Retrieves paginated users with password stripped.
   */
  async getUsers(query: AdminUsersQueryInput): Promise<PaginatedResult<SanitizedAdminUser>> {
    const result = await this.adminRepo.findUsers({
      page: query.page,
      limit: query.limit,
      role: query.role,
      isActive: query.isActive,
      verified: query.verified,
      search: query.search,
    });

    return {
      ...result,
      data: excludeFieldsMany(result.data, ['password']) as SanitizedAdminUser[],
    };
  }

  /**
   * Updates user account status (active/suspended, verified).
   * Prevents administrators from deactivating their own account.
   */
  async updateUserStatus(
    adminUserId: string,
    targetUserId: string,
    input: UpdateUserStatusInput
  ): Promise<SanitizedAdminUser> {
    const user = await this.adminRepo.findUserById(targetUserId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (input.isActive === false && adminUserId === targetUserId) {
      throw new BadRequestError('Administrators cannot deactivate their own account');
    }

    const updated = await this.adminRepo.updateUser(targetUserId, {
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.verified !== undefined ? { verified: input.verified } : {}),
    });

    // Audit log account status changes (Section 40)
    if (input.isActive === false) {
      await this.auditService.log(
        adminUserId,
        AuditAction.USER_DISABLED,
        'User',
        targetUserId,
        { previousActive: user.isActive, newActive: false }
      );
    }

    return excludeFields(updated, ['password']) as SanitizedAdminUser;
  }

  /**
   * Retrieves paginated pending equipment listings awaiting administrative review.
   */
  async getPendingAssets(options: PaginationOptions = {}): Promise<PaginatedResult<FormattedAsset>> {
    const result = await this.adminRepo.findPendingAssets(options);
    return {
      ...result,
      data: result.data.map((asset) => this.assetService.formatAsset(asset)),
    };
  }

  /**
   * Approves a PENDING equipment listing and transitions it to AVAILABLE.
   * Emits ASSET_APPROVED notification to the fleet owner.
   */
  async approveAsset(_adminUserId: string, assetId: string): Promise<FormattedAsset> {
    const asset = await this.adminRepo.findAssetById(assetId);
    if (!asset) {
      throw new NotFoundError('Equipment listing not found');
    }

    if (asset.status !== AssetStatus.PENDING_REVIEW) {
      throw new BadRequestError(
        `Cannot approve equipment with current status '${asset.status}'. Only PENDING listings can be approved.`
      );
    }

    const updated = await this.adminRepo.updateAssetStatus(
      assetId,
      AssetStatus.AVAILABLE,
      'Approved by Administrator'
    );

    // Notify equipment owner (Section 37, 39)
    await this.notifService.sendNotification(
      asset.ownerId,
      NotificationType.ASSET_APPROVED,
      'Equipment Listing Approved',
      `Your equipment listing '${asset.title}' has been approved and is now live on the marketplace fleet.`,
      { assetId: updated.id }
    );

    // Audit log asset approval (Section 40)
    await this.auditService.log(
      _adminUserId,
      AuditAction.ASSET_APPROVED,
      'Asset',
      updated.id,
      { assetTitle: updated.title, ownerId: asset.ownerId }
    );

    return this.assetService.formatAsset(updated);
  }

  /**
   * Rejects a PENDING equipment listing and records rejection notes.
   * Emits ASSET_REJECTED notification with reason to the fleet owner.
   */
  async rejectAsset(
    _adminUserId: string,
    assetId: string,
    input: AdminAssetActionInput
  ): Promise<FormattedAsset> {
    const asset = await this.adminRepo.findAssetById(assetId);
    if (!asset) {
      throw new NotFoundError('Equipment listing not found');
    }

    if (asset.status !== AssetStatus.PENDING_REVIEW) {
      throw new BadRequestError(
        `Cannot reject equipment with current status '${asset.status}'. Only PENDING listings can be rejected.`
      );
    }

    const updated = await this.adminRepo.updateAssetStatus(
      assetId,
      AssetStatus.REJECTED,
      input.reason || 'Rejected by Administrator',
      input.reason || 'Listing rejected during administrative moderation'
    );

    // Notify equipment owner (Section 37, 39)
    await this.notifService.sendNotification(
      asset.ownerId,
      NotificationType.ASSET_REJECTED,
      'Equipment Listing Rejected',
      `Your equipment listing '${asset.title}' was rejected.${input.reason ? ` Reason: ${input.reason}` : ''}`,
      { assetId: updated.id, reason: input.reason || null }
    );

    // Audit log asset rejection (Section 40)
    await this.auditService.log(
      _adminUserId,
      AuditAction.ASSET_REJECTED,
      'Asset',
      updated.id,
      { assetTitle: updated.title, ownerId: asset.ownerId, reason: input.reason }
    );

    return this.assetService.formatAsset(updated);
  }

  /**
   * Retrieves all platform bookings with comprehensive cross-user audit visibility.
   */
  async getAllBookings(query: AdminBookingsQueryInput): Promise<PaginatedResult<FormattedBooking>> {
    const result = await this.adminRepo.findBookings({
      page: query.page,
      limit: query.limit,
      status: query.status,
      assetId: query.assetId,
      renterId: query.renterId,
    });

    return {
      ...result,
      data: result.data.map((booking) => this.bookingService.formatBooking(booking)),
    };
  }
}

export const adminService = new AdminService();
