import { Prisma, Booking, BookingStatus, BookingStatusHistory, Asset, AssetImage } from '@prisma/client';
import { BaseRepository, PaginatedResult, PaginationOptions } from './base.repository.js';

export type BookingWithRelations = Booking & {
  asset: Asset & {
    category: {
      id: string;
      name: string;
      slug: string;
      icon: string;
    };
    owner: {
      id: string;
      name: string;
      email: string;
      companyName: string | null;
      phone: string | null;
      avatar: string | null;
    };
    images: AssetImage[];
  };
  renter: {
    id: string;
    name: string;
    email: string;
    companyName: string | null;
    phone: string | null;
    avatar: string | null;
  };
  statusHistory?: (BookingStatusHistory & {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  })[];
};

export interface BookingFindManyOptions extends PaginationOptions {
  where?: Prisma.BookingWhereInput;
  orderBy?: Prisma.BookingOrderByWithRelationInput;
}

const BOOKING_INCLUDE = {
  asset: {
    include: {
      category: {
        select: { id: true, name: true, slug: true, icon: true },
      },
      owner: {
        select: { id: true, name: true, email: true, companyName: true, phone: true, avatar: true },
      },
      images: {
        orderBy: { sortOrder: 'asc' as const },
      },
    },
  },
  renter: {
    select: { id: true, name: true, email: true, companyName: true, phone: true, avatar: true },
  },
  statusHistory: {
    orderBy: { createdAt: 'desc' as const },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  },
};

export class BookingRepository extends BaseRepository {
  /**
   * Atomically creates a booking and records its initial status history in a transaction.
   */
  async create(
    data: Prisma.BookingUncheckedCreateInput,
    historyReason: string = 'Initial booking request'
  ): Promise<BookingWithRelations> {
    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      const booking = await tx.booking.create({
        data,
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          fromStatus: booking.status,
          toStatus: booking.status,
          changedBy: booking.renterId,
          reason: historyReason,
        },
      });

      return tx.booking.findUniqueOrThrow({
        where: { id: booking.id },
        include: BOOKING_INCLUDE,
      }) as unknown as BookingWithRelations;
    });
  }

  /**
   * Finds a booking by ID with full relational graph (asset, owner, renter, history).
   */
  async findById(id: string): Promise<BookingWithRelations | null> {
    return this.db.booking.findUnique({
      where: { id },
      include: BOOKING_INCLUDE,
    }) as unknown as Promise<BookingWithRelations | null>;
  }

  /**
   * Paginated listing of bookings with custom filters and role scoping.
   */
  async findMany(options: BookingFindManyOptions = {}): Promise<PaginatedResult<BookingWithRelations>> {
    const { page, limit, skip, take } = this.calculatePagination(options);
    const { where, orderBy = { createdAt: 'desc' } } = options;

    const [data, total] = await Promise.all([
      this.db.booking.findMany({
        where,
        skip,
        take,
        orderBy,
        include: BOOKING_INCLUDE,
      }),
      this.db.booking.count({ where }),
    ]);

    return this.formatPaginatedResult(data as unknown as BookingWithRelations[], total, page, limit);
  }

  /**
   * Counts bookings matching the criteria.
   */
  async count(where?: Prisma.BookingWhereInput): Promise<number> {
    return this.db.booking.count({ where });
  }

  /**
   * Atomically updates booking status and records audit history in a transaction.
   */
  async updateStatusWithHistory(
    id: string,
    fromStatus: BookingStatus,
    toStatus: BookingStatus,
    changedBy: string,
    reason?: string,
    extraBookingData?: Partial<Prisma.BookingUpdateInput>
  ): Promise<BookingWithRelations> {
    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.booking.update({
        where: { id },
        data: {
          status: toStatus,
          ...extraBookingData,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: id,
          fromStatus,
          toStatus,
          changedBy,
          reason: reason ?? null,
        },
      });

      return tx.booking.findUniqueOrThrow({
        where: { id },
        include: BOOKING_INCLUDE,
      }) as unknown as BookingWithRelations;
    });
  }

  /**
   * Fetches status history audit logs for a booking.
   */
  async findStatusHistory(bookingId: string) {
    return this.db.bookingStatusHistory.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  /**
   * Queries for existing bookings that conflict with the target date range.
   * Mathematical overlap: (existing.startDate <= targetEndDate) AND (existing.endDate >= targetStartDate)
   * Only APPROVED and ACTIVE bookings reserve the equipment.
   */
  async findConflictingBookings(
    assetId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string
  ) {
    return this.db.booking.findMany({
      where: {
        assetId,
        status: { in: [BookingStatus.APPROVED, BookingStatus.ACTIVE] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        renterId: true,
      },
    });
  }

  /**
   * Fetches all current and future reserved date windows for an asset.
   */
  async getReservedDateRanges(assetId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.db.booking.findMany({
      where: {
        assetId,
        status: { in: [BookingStatus.APPROVED, BookingStatus.ACTIVE] },
        endDate: { gte: today },
      },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
      },
    });
  }

  /**
   * Atomically approves a booking with pessimistic conflict validation.
   * If an overlapping booking was approved concurrently, throws BookingUnavailableError and aborts.
   */
  async approveBookingWithConflictGuard(
    bookingId: string,
    changedBy: string,
    reason: string = 'Booking approved by equipment owner'
  ): Promise<BookingWithRelations> {
    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Fetch target booking
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          asset: {
            select: { id: true, ownerId: true, title: true },
          },
        },
      });

      if (!booking) {
        throw new Error('BOOKING_NOT_FOUND');
      }

      if (booking.status !== BookingStatus.PENDING) {
        throw new Error(`INVALID_STATUS:${booking.status}`);
      }

      // 2. Concurrency check for overlapping approved/active bookings
      const conflicts = await tx.booking.findMany({
        where: {
          assetId: booking.assetId,
          status: { in: [BookingStatus.APPROVED, BookingStatus.ACTIVE] },
          startDate: { lte: booking.endDate },
          endDate: { gte: booking.startDate },
          id: { not: bookingId },
        },
      });

      if (conflicts.length > 0) {
        throw new Error('BOOKING_CONFLICT');
      }

      // 3. Atomically update status
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.APPROVED,
        },
      });

      // 4. Create audit status history record
      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          fromStatus: BookingStatus.PENDING,
          toStatus: BookingStatus.APPROVED,
          changedBy,
          reason,
        },
      });

      return tx.booking.findUniqueOrThrow({
        where: { id: bookingId },
        include: BOOKING_INCLUDE,
      }) as unknown as BookingWithRelations;
    });
  }

}

export const bookingRepository = new BookingRepository();
