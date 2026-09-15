import { z } from 'zod';
import { paginationQuerySchema } from './common.validator.js';

export const createReviewSchema = z.object({
  bookingId: z.string().uuid({ message: 'Valid bookingId UUID is required' }),
  rating: z.coerce.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z
    .string({ required_error: 'Review comment is required' })
    .trim()
    .min(10, 'Review comment must be at least 10 characters')
    .max(1000, 'Review comment cannot exceed 1000 characters'),
  projectType: z.string().trim().max(100, 'Project type cannot exceed 100 characters').optional(),
});

export const reviewQuerySchema = paginationQuerySchema;

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ReviewQueryInput = z.infer<typeof reviewQuerySchema>;
