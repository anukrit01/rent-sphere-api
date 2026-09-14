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
}

export const bookingRepository = new BookingRepository();
