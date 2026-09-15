import { z } from 'zod';
import { BookingStatus } from '@prisma/client';
import { paginationQuerySchema } from './common.validator.js';

/**
 * Validates cost calculation requests.
 */
export const calculateBookingSchema = z
  .object({
    assetId: z.string().uuid({ message: 'Valid assetId UUID is required' }),
    startDate: z.coerce.date({ invalid_type_error: 'Invalid start date format: must be a valid ISO date' }),
    endDate: z.coerce.date({ invalid_type_error: 'Invalid end date format: must be a valid ISO date' }),
    operatorRequired: z.boolean().optional().default(false),
    deliveryRequired: z.boolean().optional().default(false),
  })
  .refine(
    (data) => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return data.startDate >= yesterday;
    },
    {
      message: 'Start date cannot be in the past',
      path: ['startDate'],
    }
  )
  .refine((data) => data.endDate > data.startDate, {
    message: 'End date must be chronologically after start date',
    path: ['endDate'],
  });

/**
 * Validates booking creation requests.
 */
export const createBookingSchema = calculateBookingSchema.and(
  z.object({
    projectLocation: z
      .string({ required_error: 'Project location is required' })
      .trim()
      .min(3, 'Project location must be at least 3 characters')
      .max(255, 'Project location cannot exceed 255 characters'),
    projectDescription: z.string().trim().max(1000, 'Project description cannot exceed 1000 characters').optional(),
  })
);

/**
 * Validates generic lifecycle status transitions.
 */
export const updateBookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus, {
    errorMap: () => ({ message: 'Invalid booking status' }),
  }),
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional(),
});

/**
 * Validates booking rejection requests.
 */
export const rejectBookingSchema = z.object({
  rejectionReason: z.string().trim().max(500, 'Rejection reason cannot exceed 500 characters').optional(),
});

/**
 * Validates booking cancellation requests.
 */
export const cancelBookingSchema = z.object({
  reason: z.string().trim().max(500, 'Cancellation reason cannot exceed 500 characters').optional(),
});

/**
 * Validates booking queries and filters.
 */
export const bookingQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(BookingStatus).optional(),
  role: z.enum(['renter', 'leaser', 'all']).optional(),
  assetId: z.string().uuid().optional(),
});

export type CalculateBookingInput = z.infer<typeof calculateBookingSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type RejectBookingInput = z.infer<typeof rejectBookingSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type BookingQueryInput = z.infer<typeof bookingQuerySchema>;

/**
 * Validates query parameters for asset availability check.
 */
export const checkAvailabilityQuerySchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate > data.startDate;
      }
      return true;
    },
    {
      message: 'End date must be chronologically after start date',
      path: ['endDate'],
    }
  );

export type CheckAvailabilityQueryInput = z.infer<typeof checkAvailabilityQuerySchema>;
