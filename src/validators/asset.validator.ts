import { z } from 'zod';
import { AssetStatus, AssetCondition, FuelType } from '@prisma/client';
import { paginationQuerySchema } from './common.validator.js';

/**
 * Validates nested technical specifications for heavy machinery.
 */
export const specificationSchema = z.object({
  brand: z
    .string({ required_error: 'Manufacturer brand is required' })
    .trim()
    .min(1, 'Brand must be at least 1 character')
    .max(100, 'Brand cannot exceed 100 characters'),
  model: z
    .string({ required_error: 'Model designation is required' })
    .trim()
    .min(1, 'Model must be at least 1 character')
    .max(100, 'Model cannot exceed 100 characters'),
  year: z
    .number({ required_error: 'Manufacturing year is required' })
    .int('Year must be an integer')
    .min(1970, 'Manufacturing year cannot be older than 1970')
    .max(new Date().getFullYear() + 1, 'Manufacturing year cannot be in the future'),
  operatingWeight: z.string().trim().max(100).optional().nullable(),
  enginePower: z.string().trim().max(100).optional().nullable(),
  fuelType: z.nativeEnum(FuelType).optional().nullable(),
  operatingHours: z.number().int().min(0, 'Operating hours cannot be negative').optional().nullable(),
  capacity: z.string().trim().max(100).optional().nullable(),
  maxReach: z.string().trim().max(100).optional().nullable(),
  boomLength: z.string().trim().max(100).optional().nullable(),
});

export const updateSpecificationSchema = specificationSchema.partial();

/**
 * Validates single image payload inside asset creation.
 */
export const assetImageInputSchema = z.union([
  z.string().url('Image must be a valid URL'),
  z.object({
    url: z.string().url('Image must be a valid URL'),
    publicId: z.string().trim().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
]);

/**
 * Validates request payload for creating an equipment listing.
 */
export const createAssetSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  tagline: z.string().trim().max(200, 'Tagline cannot exceed 200 characters').optional().nullable(),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(3000, 'Description cannot exceed 3000 characters'),
  categoryId: z
    .string({ required_error: 'Category identifier is required' })
    .trim()
    .min(1, 'Category identifier is required'),
  condition: z.nativeEnum(AssetCondition).optional().default(AssetCondition.GOOD),
  pricePerDay: z
    .number({ required_error: 'Daily rental price is required' })
    .positive('Daily rental price must be greater than zero'),
  pricePerWeek: z.number().positive('Weekly rental price must be greater than zero').optional().nullable(),
  securityDeposit: z
    .number({ required_error: 'Security deposit is required' })
    .min(0, 'Security deposit cannot be negative'),
  location: z
    .string({ required_error: 'Operating location is required' })
    .trim()
    .min(2, 'Location must be at least 2 characters')
    .max(200, 'Location cannot exceed 200 characters'),
  city: z
    .string({ required_error: 'City is required' })
    .trim()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City cannot exceed 100 characters'),
  state: z
    .string({ required_error: 'State is required' })
    .trim()
    .min(2, 'State must be at least 2 characters')
    .max(100, 'State cannot exceed 100 characters'),
  pinCode: z.string().trim().max(20).optional().nullable(),
  operatorProvided: z.boolean().optional().default(false),
  deliveryAvailable: z.boolean().optional().default(false),
  deliveryFee: z.number().min(0, 'Delivery fee cannot be negative').optional().nullable(),
  minimumRentalDays: z
    .number()
    .int('Minimum rental days must be an integer')
    .min(1, 'Minimum rental days must be at least 1')
    .optional()
    .default(1),
  features: z.array(z.string().trim()).optional().default([]),
  rentalTerms: z.array(z.string().trim()).optional().default([]),
  specification: specificationSchema,
  images: z.array(assetImageInputSchema).optional().default([]),
  status: z
    .enum([AssetStatus.DRAFT, AssetStatus.PENDING_REVIEW])
    .optional()
    .default(AssetStatus.PENDING_REVIEW),
});

/**
 * Validates request payload for updating an existing equipment listing.
 */
export const updateAssetSchema = z.object({
  title: z.string().trim().min(3).max(150).optional(),
  tagline: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().min(10).max(3000).optional(),
  categoryId: z.string().trim().min(1).optional(),
  condition: z.nativeEnum(AssetCondition).optional(),
  pricePerDay: z.number().positive().optional(),
  pricePerWeek: z.number().positive().optional().nullable(),
  securityDeposit: z.number().min(0).optional(),
  location: z.string().trim().min(2).max(200).optional(),
  city: z.string().trim().min(2).max(100).optional(),
  state: z.string().trim().min(2).max(100).optional(),
  pinCode: z.string().trim().max(20).optional().nullable(),
  operatorProvided: z.boolean().optional(),
  deliveryAvailable: z.boolean().optional(),
  deliveryFee: z.number().min(0).optional().nullable(),
  minimumRentalDays: z.number().int().min(1).optional(),
  features: z.array(z.string().trim()).optional(),
  rentalTerms: z.array(z.string().trim()).optional(),
  specification: updateSpecificationSchema.optional(),
  images: z.array(assetImageInputSchema).optional(),
  status: z.nativeEnum(AssetStatus).optional(),
});

const booleanQueryParam = z.preprocess((val) => {
  if (val === 'true' || val === true) return true;
  if (val === 'false' || val === false) return false;
  return undefined;
}, z.boolean().optional());

/**
 * Comprehensive validation schema for marketplace asset search, multi-faceted filtering, and pagination.
 */
export const assetQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  location: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0, 'minPrice must be non-negative').optional(),
  maxPrice: z.coerce.number().min(0, 'maxPrice must be non-negative').optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  condition: z.string().trim().optional(),
  fuelType: z.nativeEnum(FuelType).optional(),
  operatorProvided: booleanQueryParam,
  operatorRequired: booleanQueryParam,
  deliveryAvailable: booleanQueryParam,
  availableOnly: booleanQueryParam,
  featured: booleanQueryParam,
  status: z.nativeEnum(AssetStatus).optional(),
  sortBy: z.string().trim().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type AssetQuery = z.infer<typeof assetQuerySchema>;
