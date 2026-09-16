import { Prisma, User, UserRole, BookingStatus, AssetStatus } from '@prisma/client';
import { BaseRepository, PaginatedResult, PaginationOptions } from './base.repository.js';
import { AssetWithRelations } from './asset.repository.js';
import { BookingWithRelations } from './booking.repository.js';

export interface AdminUserFilters extends PaginationOptions {
  role?: UserRole;
  isActive?: boolean;
  verified?: boolean;
  search?: string;
}

export interface AdminBookingFilters extends PaginationOptions {
  status?: BookingStatus;
  assetId?: string;
  renterId?: string;
}

export interface DashboardMetrics {
  users: {
    total: number;
    renters: number;
    leasers: number;
    admins: number;
    active: number;
    verified: number;
  };
  assets: {
    total: number;
    pending: number;
    available: number;
    rented: number;
    maintenance: number;
  };
  bookings: {
    total: number;
    pending: number;
    approved: number;
    active: number;
    completed: number;
    cancelled: number;
    rejected: number;
  };
  financials: {
    totalRentalRevenue: number;
    activeEscrowDeposits: number;
  };
  recentActivity: {
    recentPendingAssets: Array<{
      id: string;
      title: string;
      ownerName: string;
      category: string;
      dailyRate: number;
      createdAt: Date;
    }>;
    recentBookings: Array<{
      id: string;
      assetTitle: string;
      renterName: string;
      status: BookingStatus;
      estimatedTotal: number;
      createdAt: Date;
    }>;
  };
}

export class AdminRepository extends BaseRepository {
  /**
   * Aggregates platform-wide dashboard metrics across users, assets, bookings, and revenue.
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [
      totalUsers,
      renters,
      leasers,
      admins,
      activeUsers,
      verifiedUsers,
      totalAssets,
      pendingAssets,
      availableAssets,
      rentedAssets,
      maintenanceAssets,
      totalBookings,
      pendingBookings,
      approvedBookings,
      activeBookings,
      completedBookings,
      cancelledBookings,
      rejectedBookings,
      completedFinancials,
      escrowFinancials,
      recentPending,
      recentBookingsData,
    ] = await Promise.all([
      this.db.user.count(),
      this.db.user.count({ where: { role: UserRole.RENTER } }),
      this.db.user.count({ where: { role: UserRole.LEASER } }),
      this.db.user.count({ where: { role: UserRole.ADMIN } }),
      this.db.user.count({ where: { isActive: true } }),
      this.db.user.count({ where: { verified: true } }),

      this.db.asset.count(),
      this.db.asset.count({ where: { status: AssetStatus.PENDING_REVIEW } }),
      this.db.asset.count({ where: { status: AssetStatus.AVAILABLE } }),
      this.db.asset.count({ where: { status: AssetStatus.RENTED } }),
      this.db.asset.count({ where: { status: AssetStatus.MAINTENANCE } }),

      this.db.booking.count(),
      this.db.booking.count({ where: { status: BookingStatus.PENDING } }),
      this.db.booking.count({ where: { status: BookingStatus.APPROVED } }),
      this.db.booking.count({ where: { status: BookingStatus.ACTIVE } }),
      this.db.booking.count({ where: { status: BookingStatus.COMPLETED } }),
      this.db.booking.count({ where: { status: BookingStatus.CANCELLED } }),
      this.db.booking.count({ where: { status: BookingStatus.REJECTED } }),

      this.db.booking.aggregate({
        where: { status: BookingStatus.COMPLETED },
        _sum: { rentalSubtotal: true },
      }),

      this.db.booking.aggregate({
        where: { status: { in: [BookingStatus.APPROVED, BookingStatus.ACTIVE] } },
        _sum: { securityDeposit: true },
      }),

      this.db.asset.findMany({
        where: { status: AssetStatus.PENDING_REVIEW },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { name: true } },
          category: { select: { name: true } },
        },
      }),

      this.db.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          renter: { select: { name: true } },
          asset: { select: { title: true } },
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        renters,
        leasers,
        admins,
        active: activeUsers,
        verified: verifiedUsers,
      },
      assets: {
        total: totalAssets,
        pending: pendingAssets,
        available: availableAssets,
        rented: rentedAssets,
        maintenance: maintenanceAssets,
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        approved: approvedBookings,
        active: activeBookings,
        completed: completedBookings,
        cancelled: cancelledBookings,
        rejected: rejectedBookings,
      },
      financials: {
        totalRentalRevenue: Number(completedFinancials._sum.rentalSubtotal || 0),
        activeEscrowDeposits: Number(escrowFinancials._sum.securityDeposit || 0),
      },
      recentActivity: {
        recentPendingAssets: recentPending.map((a) => ({
          id: a.id,
          title: a.title,
          ownerName: a.owner.name,
          category: a.category.name,
          dailyRate: Number(a.pricePerDay),
          createdAt: a.createdAt,
        })),
        recentBookings: recentBookingsData.map((b) => ({
          id: b.id,
          assetTitle: b.asset.title,
          renterName: b.renter.name,
          status: b.status,
          estimatedTotal: Number(b.estimatedTotal),
          createdAt: b.createdAt,
        })),
      },
    };
  }

  /**
   * Retrieves paginated users with optional role, status, and text search filters.
   */
  async findUsers(filters: AdminUserFilters = {}): Promise<PaginatedResult<User>> {
    const { page, limit, skip, take } = this.calculatePagination(filters);

    const where: Prisma.UserWhereInput = {
      ...(filters.role ? { role: filters.role } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.verified !== undefined ? { verified: filters.verified } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
              { companyName: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.user.count({ where }),
    ]);

    return this.formatPaginatedResult(data, total, page, limit);
  }

  /**
   * Updates a user's status or verification flags.
   */
  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.db.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Finds a user by ID.
   */
  async findUserById(id: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { id },
    });
  }

  /**
   * Retrieves paginated pending equipment listings awaiting moderation.
   */
  async findPendingAssets(options: PaginationOptions = {}): Promise<PaginatedResult<AssetWithRelations>> {
    const { page, limit, skip, take } = this.calculatePagination(options);
    const where: Prisma.AssetWhereInput = { status: AssetStatus.PENDING_REVIEW };

    const [data, total] = await Promise.all([
      this.db.asset.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          category: true,
          specification: true,
          images: { orderBy: { sortOrder: 'asc' } },
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              companyName: true,
              avatar: true,
              verified: true,
              rating: true,
              location: true,
              createdAt: true,
            },
          },
        },
      }),
      this.db.asset.count({ where }),
    ]);

    return this.formatPaginatedResult(data as AssetWithRelations[], total, page, limit);
  }

  /**
   * Finds an asset by ID with complete relations.
   */
  async findAssetById(id: string): Promise<AssetWithRelations | null> {
    return this.db.asset.findUnique({
      where: { id },
      include: {
        category: true,
        specification: true,
        images: { orderBy: { sortOrder: 'asc' } },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            companyName: true,
            avatar: true,
            verified: true,
            rating: true,
            location: true,
            createdAt: true,
          },
        },
      },
    }) as unknown as Promise<AssetWithRelations | null>;
  }

  /**
   * Updates an asset's status and administrative notes.
   */
  async updateAssetStatus(
    id: string,
    status: AssetStatus,
    adminNotes?: string | null,
    auditReason?: string | null
  ): Promise<AssetWithRelations> {
    return this.db.asset.update({
      where: { id },
      data: {
        status,
        ...(adminNotes !== undefined ? { adminNotes } : {}),
        ...(auditReason !== undefined ? { auditReason } : {}),
      },
      include: {
        category: true,
        specification: true,
        images: { orderBy: { sortOrder: 'asc' } },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            companyName: true,
            avatar: true,
            verified: true,
            rating: true,
            location: true,
            createdAt: true,
          },
        },
      },
    }) as unknown as Promise<AssetWithRelations>;
  }

  /**
   * Retrieves all platform bookings with filters and full relation graph.
   */
  async findBookings(filters: AdminBookingFilters = {}): Promise<PaginatedResult<BookingWithRelations>> {
    const { page, limit, skip, take } = this.calculatePagination(filters);

    const where: Prisma.BookingWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.assetId ? { assetId: filters.assetId } : {}),
      ...(filters.renterId ? { renterId: filters.renterId } : {}),
    };

    const [data, total] = await Promise.all([
      this.db.booking.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: {
            include: {
              category: true,
              images: { orderBy: { sortOrder: 'asc' } },
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  companyName: true,
                  phone: true,
                  avatar: true,
                },
              },
            },
          },
          renter: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
              phone: true,
              avatar: true,
            },
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      }),
      this.db.booking.count({ where }),
    ]);

    return this.formatPaginatedResult(data as BookingWithRelations[], total, page, limit);
  }
}

export const adminRepository = new AdminRepository();
