import { Request, Response } from 'express';
import { reviewService, ReviewService } from '../services/review.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AuthUser } from '../middleware/auth.middleware.js';
import { ReviewQueryInput } from '../validators/review.validator.js';

export class ReviewController {
  constructor(private readonly service: ReviewService = reviewService) {}

  /**
   * POST /api/v1/assets/:id/reviews
   */
  createReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const assetId = req.params.id as string;
    const review = await this.service.createReview(user.id, assetId, req.body);
    sendCreated(res, review, { message: 'Review submitted successfully' });
  });

  /**
   * GET /api/v1/assets/:id/reviews
   */
  getAssetReviews = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const assetId = req.params.id as string;
    const query = req.query as unknown as ReviewQueryInput;
    const paginated = await this.service.getAssetReviews(assetId, query);
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
   * GET /api/v1/bookings/:id/review
   */
  getBookingReview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.id as string;
    const review = await this.service.getBookingReview(bookingId);
    sendSuccess(res, review, 200);
  });
}

export const reviewController = new ReviewController();
