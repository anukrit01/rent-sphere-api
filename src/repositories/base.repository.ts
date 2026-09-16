import { prisma } from '../database/prisma.js';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Base repository providing standard helper logic and transaction access.
 */
export abstract class BaseRepository {
  protected readonly db = prisma;

  /**
   * Helper to calculate pagination skip/take and build metadata.
   */
  protected calculatePagination(options: PaginationOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    return { page, limit, skip, take: limit };
  }

  /**
   * Helper to format raw data and total count into a PaginatedResult.
   */
  protected formatPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}
