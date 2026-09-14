import { z } from 'zod';

/**
 * Validates request payload for creating a new equipment category.
 */
export const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug cannot exceed 100 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe lowercase kebab-case')
    .optional(),
  icon: z
    .string({ required_error: 'Category icon is required' })
    .trim()
    .min(2, 'Category icon must be at least 2 characters')
    .max(50, 'Category icon identifier cannot exceed 50 characters'),
  description: z
    .string({ required_error: 'Category description is required' })
    .trim()
    .min(5, 'Category description must be at least 5 characters')
    .max(1000, 'Category description cannot exceed 1000 characters'),
  image: z
    .string()
    .trim()
    .url('Image must be a valid URL')
    .optional()
    .nullable(),
  featured: z
    .boolean()
    .optional()
    .default(false),
});

/**
 * Validates request payload for updating an existing category.
 */
export const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name cannot exceed 100 characters')
    .optional(),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .max(100, 'Slug cannot exceed 100 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe lowercase kebab-case')
    .optional(),
  icon: z
    .string()
    .trim()
    .min(2, 'Category icon must be at least 2 characters')
    .max(50, 'Category icon identifier cannot exceed 50 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .min(5, 'Category description must be at least 5 characters')
    .max(1000, 'Category description cannot exceed 1000 characters')
    .optional(),
  image: z
    .string()
    .trim()
    .url('Image must be a valid URL')
    .optional()
    .nullable(),
  featured: z
    .boolean()
    .optional(),
});

/**
 * Validates query parameters for listing categories.
 */
export const categoryQuerySchema = z.object({
  featured: z
    .preprocess((val) => {
      if (val === 'true' || val === true) return true;
      if (val === 'false' || val === false) return false;
      return undefined;
    }, z.boolean().optional()),
  search: z.string().trim().optional(),
  sortBy: z.enum(['name', 'createdAt', 'assetCount']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Validates parameter accepting either a UUID or a URL-safe slug.
 */
export const categoryIdOrSlugParamSchema = z.object({
  idOrSlug: z
    .string({ required_error: 'Category identifier is required' })
    .trim()
    .min(1, 'Category identifier cannot be empty'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryQuery = z.infer<typeof categoryQuerySchema>;
export type CategoryIdOrSlugParam = z.infer<typeof categoryIdOrSlugParamSchema>;
