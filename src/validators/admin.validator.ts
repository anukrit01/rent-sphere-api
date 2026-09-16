import { z } from 'zod';
import { UserRole, BookingStatus } from '@prisma/client';
import { paginationQuerySchema } from './common.validator.js';

const booleanQueryParam = z.preprocess((val) => {
  if (val === 'true' || val === true) return true;
  if (val === 'false' || val === false) return false;
  return undefined;
}, z.boolean().optional());

export const adminUsersQuerySchema = paginationQuerySchema.extend({
  role: z.nativeEnum(UserRole).optional(),
  isActive: booleanQueryParam,
  verified: booleanQueryParam,
  search: z.string().trim().optional(),
});

export const updateUserStatusSchema = z
  .object({
    isActive: z.boolean().optional(),
    verified: z.boolean().optional(),
  })
  .refine((data) => data.isActive !== undefined || data.verified !== undefined, {
    message: 'At least one of isActive or verified must be provided',
  });

export const adminAssetActionSchema = z.object({
  reason: z.string().trim().max(1000, 'Reason cannot exceed 1000 characters').optional(),
});

export const adminBookingsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(BookingStatus).optional(),
  assetId: z.string().uuid({ message: 'assetId must be a valid UUID' }).optional(),
  renterId: z.string().uuid({ message: 'renterId must be a valid UUID' }).optional(),
});

export type AdminUsersQueryInput = z.infer<typeof adminUsersQuerySchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type AdminAssetActionInput = z.infer<typeof adminAssetActionSchema>;
export type AdminBookingsQueryInput = z.infer<typeof adminBookingsQuerySchema>;
