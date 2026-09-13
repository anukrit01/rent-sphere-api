import { z } from 'zod';

/**
 * Validates route parameters containing a standard UUID.
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format: must be a valid UUID' }),
});

/**
 * Validates and coerces standard pagination query parameters.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(10),
});

/**
 * Validates date ranges, ensuring ISO format and that endDate > startDate.
 */
export const dateRangeSchema = z
  .object({
    startDate: z.coerce.date({ invalid_type_error: 'Invalid start date format: must be a valid ISO date' }),
    endDate: z.coerce.date({ invalid_type_error: 'Invalid end date format: must be a valid ISO date' }),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be chronologically after start date',
    path: ['endDate'],
  });

/**
 * Generic search and sort query schema.
 */
export const searchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().optional(),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type UuidParam = z.infer<typeof uuidParamSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
