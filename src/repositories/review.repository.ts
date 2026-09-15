import { Prisma, Review } from '@prisma/client';
import { BaseRepository, PaginatedResult, PaginationOptions } from './base.repository.js';

export type ReviewWithAuthor = Review & {
  author: {
    id: string;
    name: string;
    companyName: string | null;
    avatar: string | null;
  };
};

export class ReviewRepository extends BaseRepository {
  /**
   * Atomically creates a review and recalculates ratings for the asset and owner.
   */
  async createWithAggregates(
    data: Prisma.ReviewUncheckedCreateInput,
    assetId: string,
    ownerId: string
  ): Promise<ReviewWithAuthor> {
    return this.db.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Insert review
      const review = await tx.review.create({
        data,
        include: {
          author: {
            select: { id: true, name: true, companyName: true, avatar: true },
          },
        },
      });

      // 2. Recalculate asset aggregates
      const assetAgg = await tx.review.aggregate({
        where: { assetId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      const avgAssetRating = Math.round((assetAgg._avg.rating || 0) * 10) / 10;
      const totalReviews = assetAgg._count.rating || 0;

      await tx.asset.update({
        where: { id: assetId },
        data: {
          rating: avgAssetRating,
          reviewCount: totalReviews,
        },
      });

      // 3. Recalculate owner composite rating across all their listings
      const ownerAgg = await tx.review.aggregate({
        where: {
          asset: { ownerId },
        },
        _avg: { rating: true },
      });

      const avgOwnerRating = Math.round((ownerAgg._avg.rating || 0) * 10) / 10;

      await tx.user.update({
        where: { id: ownerId },
        data: {
          rating: avgOwnerRating,
        },
      });

      return review as ReviewWithAuthor;
    });
  }

  /**
   * Finds a review by booking ID.
   */
  async findByBookingId(bookingId: string): Promise<ReviewWithAuthor | null> {
    return this.db.review.findUnique({
      where: { bookingId },
      include: {
        author: {
          select: { id: true, name: true, companyName: true, avatar: true },
        },
      },
    }) as unknown as Promise<ReviewWithAuthor | null>;
  }

  /**
   * Returns paginated reviews for a specific asset.
   */
  async findByAssetId(
    assetId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<ReviewWithAuthor>> {
    const { page, limit, skip, take } = this.calculatePagination(options);

    const [data, total] = await Promise.all([
      this.db.review.findMany({
        where: { assetId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          author: {
            select: { id: true, name: true, companyName: true, avatar: true },
          },
        },
      }),
      this.db.review.count({ where: { assetId } }),
    ]);

    return this.formatPaginatedResult(data as ReviewWithAuthor[], total, page, limit);
  }
}

export const reviewRepository = new ReviewRepository();
