import { BookingStatus, NotificationType } from '@prisma/client';
import { reviewRepository, ReviewRepository, ReviewWithAuthor } from '../repositories/review.repository.js';
import { assetRepository, AssetRepository } from '../repositories/asset.repository.js';
import { bookingRepository, BookingRepository } from '../repositories/booking.repository.js';
import { userRepository, UserRepository } from '../repositories/user.repository.js';
import { CreateReviewInput, ReviewQueryInput } from '../validators/review.validator.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../errors/app.error.js';
import { PaginatedResult } from '../repositories/base.repository.js';
import { notificationService, NotificationService } from './notification.service.js';

export interface FormattedReview {
  id: string;
  authorName: string;
  authorCompany?: string | null;
  authorAvatar?: string | null;
  rating: number;
  date: string;
  comment: string;
  projectType?: string | null;
  bookingId?: string | null;
  assetId: string;
}

export class ReviewService {
  constructor(
    private readonly reviewRepo: ReviewRepository = reviewRepository,
    private readonly assetRepo: AssetRepository = assetRepository,
    private readonly bookingRepo: BookingRepository = bookingRepository,
    private readonly userRepo: UserRepository = userRepository,
    private readonly notifService: NotificationService = notificationService
  ) {}

  /**
   * Submits a verified review for a completed equipment rental (Section 36).
   */
  async createReview(userId: string, assetId: string, input: CreateReviewInput): Promise<FormattedReview> {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundError('Equipment listing not found');
    }

    const booking = await this.bookingRepo.findById(input.bookingId);
    if (!booking) {
      throw new NotFoundError('Booking record not found');
    }

    // Rule 1: Caller must own the booking
    if (booking.renterId !== userId) {
      throw new ForbiddenError('You can only review rentals that you booked.');
    }

    // Rule 2: Booking must be COMPLETED
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestError(
        `Reviews are only permitted for completed rentals. Current booking status: '${booking.status}'.`
      );
    }

    // Rule 3: Asset must match booking
    if (booking.assetId !== assetId) {
      throw new BadRequestError('The specified booking does not match this equipment listing.');
    }

    // Rule 4: One review per booking
    const existingReview = await this.reviewRepo.findByBookingId(input.bookingId);
    if (existingReview) {
      throw new BadRequestError('This rental booking has already been reviewed.');
    }

    // Fetch author info for metadata
    const user = await this.userRepo.findById(userId);

    const review = await this.reviewRepo.createWithAggregates(
      {
        assetId,
        authorId: userId,
        bookingId: input.bookingId,
        rating: input.rating,
        comment: input.comment,
        authorName: user?.name || 'Verified Renter',
        authorCompany: user?.companyName || null,
        projectType: input.projectType || null,
      },
      assetId,
      asset.ownerId
    );

    // Notify equipment owner of new review (Section 37)
    await this.notifService.sendNotification(
      asset.ownerId,
      NotificationType.REVIEW_RECEIVED,
      'New Review Received',
      `You received a ${input.rating}-star review for '${asset.title}'.`,
      { reviewId: review.id, assetId, rating: input.rating, bookingId: input.bookingId }
    );

    return this.formatReview(review);
  }

  /**
   * Retrieves public paginated reviews for an equipment listing.
   */
  async getAssetReviews(assetId: string, query: ReviewQueryInput): Promise<PaginatedResult<FormattedReview>> {
    const asset = await this.assetRepo.findById(assetId);
    if (!asset) {
      throw new NotFoundError('Equipment listing not found');
    }

    const result = await this.reviewRepo.findByAssetId(assetId, {
      page: query.page,
      limit: query.limit,
    });

    return {
      ...result,
      data: result.data.map((r) => this.formatReview(r)),
    };
  }

  /**
   * Retrieves the review associated with a specific booking.
   */
  async getBookingReview(bookingId: string): Promise<FormattedReview | null> {
    const review = await this.reviewRepo.findByBookingId(bookingId);
    return review ? this.formatReview(review) : null;
  }

  /**
   * Formats a Review entity to match the Angular AssetReview interface.
   */
  private formatReview(review: ReviewWithAuthor): FormattedReview {
    return {
      id: review.id,
      authorName: review.authorName,
      authorCompany: review.authorCompany,
      authorAvatar: review.author?.avatar || null,
      rating: review.rating,
      date: review.createdAt.toISOString().split('T')[0]!,
      comment: review.comment,
      projectType: review.projectType,
      bookingId: review.bookingId,
      assetId: review.assetId,
    };
  }
}

export const reviewService = new ReviewService();
