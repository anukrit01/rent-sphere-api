import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller.js';
import { reviewController } from '../controllers/review.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validate.middleware.js';
import { uuidParamSchema } from '../validators/common.validator.js';
import {
  calculateBookingSchema,
  createBookingSchema,
  bookingQuerySchema,
  updateBookingStatusSchema,
  rejectBookingSchema,
  cancelBookingSchema,
  checkAvailabilityQuerySchema,
} from '../validators/booking.validator.js';

const router = Router();

// All booking operations require authentication
router.use(authenticate);

// Check asset availability and reserved calendar intervals
router.get(
  '/availability/:id',
  validateRequest({ params: uuidParamSchema, query: checkAvailabilityQuerySchema }),
  bookingController.getAssetAvailability
);

// Cost calculation estimation endpoint
router.post(
  '/calculate',
  validateRequest({ body: calculateBookingSchema }),
  bookingController.calculateCost
);

// Create new rental booking request
router.post(
  '/',
  validateRequest({ body: createBookingSchema }),
  bookingController.createBooking
);

// List role-scoped bookings
router.get(
  '/',
  validateRequest({ query: bookingQuerySchema }),
  bookingController.getBookings
);

// Get single booking details
router.get(
  '/:id',
  validateRequest({ params: uuidParamSchema }),
  bookingController.getBookingById
);

// Get status audit history
router.get(
  '/:id/history',
  validateRequest({ params: uuidParamSchema }),
  bookingController.getStatusHistory
);

// Approve pending booking (Leaser or Admin)
router.patch(
  '/:id/approve',
  validateRequest({ params: uuidParamSchema }),
  bookingController.approveBooking
);

// Reject pending booking (Leaser or Admin)
router.patch(
  '/:id/reject',
  validateRequest({ params: uuidParamSchema, body: rejectBookingSchema }),
  bookingController.rejectBooking
);

// Cancel booking (Renter, Leaser, or Admin)
router.patch(
  '/:id/cancel',
  validateRequest({ params: uuidParamSchema, body: cancelBookingSchema }),
  bookingController.cancelBooking
);

// Lifecycle status transitions (e.g. APPROVED -> ACTIVE, ACTIVE -> COMPLETED)
router.patch(
  '/:id/status',
  validateRequest({ params: uuidParamSchema, body: updateBookingStatusSchema }),
  bookingController.updateBookingStatus
);

export { router as bookingRoutes };

// Get review for booking
router.get(
  '/:id/review',
  validateRequest({ params: uuidParamSchema }),
  reviewController.getBookingReview
);
