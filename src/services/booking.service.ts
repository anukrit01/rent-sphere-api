import { BookingStatus, Prisma } from '@prisma/client';
import { bookingRepository, BookingRepository, BookingWithRelations } from '../repositories/booking.repository.js';
import { assetRepository, AssetRepository } from '../repositories/asset.repository.js';
import {
  CalculateBookingInput,
  CreateBookingInput,
  BookingQueryInput,
} from '../validators/booking.validator.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../errors/app.error.js';
import { PaginatedResult } from '../repositories/base.repository.js';
import { AuthUser } from '../middleware/auth.middleware.js';

export interface FormattedBooking {
  id: string;
  assetId: string;
  asset?: {
    id: string;
    title: string;
    category: string;
    categorySlug: string;
    coverImage: string | null;
    dailyRate: number;
    ownerId: string;
    owner: {
      id: string;
      name: string;
      email: string;
      companyName: string | null;
      phone: string | null;
      avatar: string | null;
    };
  };
  renterId: string;
  renterName?: string;
  renterCompany?: string | null;
  renterPhone?: string | null;
  renter?: {
    id: string;
    name: string;
    email: string;
    companyName: string | null;
    phone: string | null;
    avatar: string | null;
  };
  startDate: string;
  endDate: string;
  durationDays: number;
  dailyRate: number;
  rentalSubtotal: number;
  operatorRequired: boolean;
  operatorFee: number;
  deliveryRequired: boolean;
  deliveryFee: number;
  securityDeposit: number;
  estimatedTotal: number;
  projectLocation: string;
  projectDescription: string | null;
  status: BookingStatus;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory?: Array<{
    id: string;
    fromStatus: BookingStatus;
    toStatus: BookingStatus;
    changedBy: string;
    changedByName?: string;
    reason: string | null;
    createdAt: string;
  }>;
}

export class BookingService {
  constructor(
    private readonly bookingRepo: BookingRepository = bookingRepository,
    private readonly assetRepo: AssetRepository = assetRepository
  ) {}

  /**
   * Pre-booking calculation engine: validates dates and computes cost breakdown.
   */
  async calculateBookingCost(input: CalculateBookingInput) {
    const asset = await this.assetRepo.findById(input.assetId);
    if (!asset) {
      throw new NotFoundError('Equipment listing not found');
    }

    if (asset.status !== 'AVAILABLE' && asset.status !== 'APPROVED') {
      throw new BadRequestError('This equipment is currently not available for rental');
    }

    const msDiff = input.endDate.getTime() - input.startDate.getTime();
    const durationDays = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)));

    if (durationDays < asset.minimumRentalDays) {
      throw new BadRequestError(
        `Minimum rental duration for this equipment is ${asset.minimumRentalDays} day(s). Requested: ${durationDays} day(s).`
      );
    }

    const dailyRate = asset.pricePerDay;
    const rentalSubtotal = dailyRate * durationDays;
    const operatorFee = input.operatorRequired ? 800 * durationDays : 0;
    const deliveryFee = input.deliveryRequired ? (asset.deliveryFee ?? 2500) : 0;
    const securityDeposit = asset.securityDeposit;
    const estimatedTotal = rentalSubtotal + operatorFee + deliveryFee + securityDeposit;

    return {
      durationDays,
      dailyRate,
      rentalSubtotal,
      operatorFee,
      deliveryFee,
      securityDeposit,
      estimatedTotal,
      asset: {
        id: asset.id,
        title: asset.title,
        pricePerDay: asset.pricePerDay,
        minimumRentalDays: asset.minimumRentalDays,
        ownerId: asset.ownerId,
      },
    };
  }

  /**
   * Creates a rental booking request with an immutable pricing snapshot and initial history.
   */
  async createBooking(userId: string, input: CreateBookingInput): Promise<FormattedBooking> {
    const calculation = await this.calculateBookingCost(input);

    if (calculation.asset.ownerId === userId) {
      throw new BadRequestError('You cannot rent your own equipment');
    }

    const booking = await this.bookingRepo.create(
      {
        assetId: input.assetId,
        renterId: userId,
        startDate: input.startDate,
        endDate: input.endDate,
        durationDays: calculation.durationDays,
        dailyRate: calculation.dailyRate,
        rentalSubtotal: calculation.rentalSubtotal,
        operatorFee: calculation.operatorFee,
        deliveryFee: calculation.deliveryFee,
        securityDeposit: calculation.securityDeposit,
        estimatedTotal: calculation.estimatedTotal,
        operatorRequired: input.operatorRequired ?? false,
        deliveryRequired: input.deliveryRequired ?? false,
        projectLocation: input.projectLocation,
        projectDescription: input.projectDescription ?? null,
        status: BookingStatus.PENDING,
      },
      'Rental booking request initiated by renter'
    );

    return this.formatBooking(booking);
  }

  /**
   * Retrieves role-scoped bookings (Section 34).
   * - Renter: sees their bookings
   * - Leaser: sees bookings for assets they own
   * - Admin: sees all bookings or filtered by query
   */
  async getBookings(user: AuthUser, query: BookingQueryInput): Promise<PaginatedResult<FormattedBooking>> {
    const where: Prisma.BookingWhereInput = {};

    if (user.role === 'RENTER') {
      where.renterId = user.id;
    } else if (user.role === 'LEASER') {
      if (query.role === 'renter') {
        where.renterId = user.id;
      } else {
        where.asset = { ownerId: user.id };
      }
    } else if (user.role === 'ADMIN') {
      if (query.role === 'renter') {
        where.renterId = user.id;
      } else if (query.role === 'leaser') {
        where.asset = { ownerId: user.id };
      }
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.assetId) {
      where.assetId = query.assetId;
    }

    const result = await this.bookingRepo.findMany({
      page: query.page,
      limit: query.limit,
      where,
    });

    return {
      ...result,
      data: result.data.map((b) => this.formatBooking(b)),
    };
  }

  /**
   * Fetches single booking details with ownership verification.
   */
  async getBookingById(user: AuthUser, id: string): Promise<FormattedBooking> {
    const booking = await this.bookingRepo.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const isRenter = booking.renterId === user.id;
    const isOwner = booking.asset.ownerId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isRenter && !isOwner && !isAdmin) {
      throw new ForbiddenError('You do not have permission to view this booking');
    }

    return this.formatBooking(booking);
  }

  /**
   * Leaser or Admin approves a PENDING booking.
   */
  async approveBooking(user: AuthUser, id: string): Promise<FormattedBooking> {
    const booking = await this.bookingRepo.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const isOwner = booking.asset.ownerId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only the equipment owner or an administrator can approve this booking');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestError(
        `Cannot approve booking with current status '${booking.status}'. Only PENDING bookings can be approved.`
      );
    }

    const updated = await this.bookingRepo.updateStatusWithHistory(
      id,
      booking.status,
      BookingStatus.APPROVED,
      user.id,
      'Booking approved by equipment owner'
    );

    return this.formatBooking(updated);
  }

  /**
   * Leaser or Admin rejects a PENDING booking.
   */
  async rejectBooking(user: AuthUser, id: string, rejectionReason?: string): Promise<FormattedBooking> {
    const booking = await this.bookingRepo.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const isOwner = booking.asset.ownerId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only the equipment owner or an administrator can reject this booking');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestError(
        `Cannot reject booking with current status '${booking.status}'. Only PENDING bookings can be rejected.`
      );
    }

    const updated = await this.bookingRepo.updateStatusWithHistory(
      id,
      booking.status,
      BookingStatus.REJECTED,
      user.id,
      rejectionReason || 'Booking rejected by equipment owner',
      { rejectionReason: rejectionReason || null }
    );

    return this.formatBooking(updated);
  }

  /**
   * Renter, Leaser, or Admin cancels a booking before it is completed.
   */
  async cancelBooking(user: AuthUser, id: string, reason?: string): Promise<FormattedBooking> {
    const booking = await this.bookingRepo.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const isRenter = booking.renterId === user.id;
    const isOwner = booking.asset.ownerId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isRenter && !isOwner && !isAdmin) {
      throw new ForbiddenError('You do not have permission to cancel this booking');
    }

    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.APPROVED) {
      throw new BadRequestError(
        `Cannot cancel booking with current status '${booking.status}'. Only PENDING or APPROVED bookings can be cancelled.`
      );
    }

    const actor = isRenter ? 'renter' : isOwner ? 'owner' : 'admin';
    const updated = await this.bookingRepo.updateStatusWithHistory(
      id,
      booking.status,
      BookingStatus.CANCELLED,
      user.id,
      reason || `Booking cancelled by ${actor}`
    );

    return this.formatBooking(updated);
  }

  /**
   * Handles valid lifecycle status transitions (e.g. APPROVED -> ACTIVE, ACTIVE -> COMPLETED).
   */
  async updateBookingStatus(
    user: AuthUser,
    id: string,
    newStatus: BookingStatus,
    reason?: string
  ): Promise<FormattedBooking> {
    const booking = await this.bookingRepo.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const isOwner = booking.asset.ownerId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only the equipment owner or an administrator can update booking status');
    }

    // State machine transition validation
    const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
      PENDING: [BookingStatus.APPROVED, BookingStatus.REJECTED, BookingStatus.CANCELLED],
      APPROVED: [BookingStatus.ACTIVE, BookingStatus.CANCELLED],
      ACTIVE: [BookingStatus.COMPLETED],
      REJECTED: [],
      CANCELLED: [],
      COMPLETED: [],
    };

    const validNextStates = allowedTransitions[booking.status] || [];
    if (!validNextStates.includes(newStatus)) {
      throw new BadRequestError(
        `Invalid status transition from '${booking.status}' to '${newStatus}'. Allowed: [${validNextStates.join(', ')}]`
      );
    }

    const updated = await this.bookingRepo.updateStatusWithHistory(
      id,
      booking.status,
      newStatus,
      user.id,
      reason || `Status updated to ${newStatus}`
    );

    return this.formatBooking(updated);
  }

  /**
   * Retrieves chronological audit history of status changes.
   */
  async getStatusHistory(user: AuthUser, id: string) {
    const booking = await this.bookingRepo.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }

    const isRenter = booking.renterId === user.id;
    const isOwner = booking.asset.ownerId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isRenter && !isOwner && !isAdmin) {
      throw new ForbiddenError('You do not have permission to view status history for this booking');
    }

    const history = await this.bookingRepo.findStatusHistory(id);
    return history.map((h: any) => ({
      id: h.id,
      bookingId: h.bookingId,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      changedBy: h.changedBy,
      changedByName: h.user?.name,
      changedByRole: h.user?.role,
      reason: h.reason,
      createdAt: h.createdAt.toISOString(),
    }));
  }

  /**
   * Formats a raw Prisma booking relation record into a standardized API response.
   */
  private formatBooking(b: BookingWithRelations): FormattedBooking {
    const coverImage =
      b.asset.images.find((img) => img.isCover)?.url || b.asset.images[0]?.url || null;

    const startDateStr = b.startDate instanceof Date ? b.startDate.toISOString().split('T')[0]! : String(b.startDate);
    const endDateStr = b.endDate instanceof Date ? b.endDate.toISOString().split('T')[0]! : String(b.endDate);

    return {
      id: b.id,
      assetId: b.assetId,
      asset: {
        id: b.asset.id,
        title: b.asset.title,
        category: b.asset.category.name,
        categorySlug: b.asset.category.slug,
        coverImage,
        dailyRate: b.asset.pricePerDay,
        ownerId: b.asset.ownerId,
        owner: {
          id: b.asset.owner.id,
          name: b.asset.owner.name,
          email: b.asset.owner.email,
          companyName: b.asset.owner.companyName,
          phone: b.asset.owner.phone,
          avatar: b.asset.owner.avatar,
        },
      },
      renterId: b.renterId,
      renterName: b.renter?.name,
      renterCompany: b.renter?.companyName,
      renterPhone: b.renter?.phone,
      renter: {
        id: b.renter.id,
        name: b.renter.name,
        email: b.renter.email,
        companyName: b.renter.companyName,
        phone: b.renter.phone,
        avatar: b.renter.avatar,
      },
      startDate: startDateStr,
      endDate: endDateStr,
      durationDays: b.durationDays,
      dailyRate: b.dailyRate,
      rentalSubtotal: b.rentalSubtotal,
      operatorRequired: b.operatorRequired,
      operatorFee: b.operatorFee,
      deliveryRequired: b.deliveryRequired,
      deliveryFee: b.deliveryFee,
      securityDeposit: b.securityDeposit,
      estimatedTotal: b.estimatedTotal,
      projectLocation: b.projectLocation,
      projectDescription: b.projectDescription,
      status: b.status,
      rejectionReason: b.rejectionReason,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      statusHistory: b.statusHistory?.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        changedBy: h.changedBy,
        changedByName: h.user?.name,
        reason: h.reason,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  }
}

export const bookingService = new BookingService();
