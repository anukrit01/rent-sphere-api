import { Request, Response } from 'express';
import { bookingService, BookingService } from '../services/booking.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AuthUser } from '../middleware/auth.middleware.js';
import { BookingQueryInput } from '../validators/booking.validator.js';

export class BookingController {
  constructor(private readonly service: BookingService = bookingService) {}

  /**
   * POST /api/v1/bookings/calculate
   */
  calculateCost = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.calculateBookingCost(req.body);
    sendSuccess(res, result, 200, { message: 'Booking cost calculation computed successfully' });
  });

  /**
   * POST /api/v1/bookings
   */
  createBooking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const booking = await this.service.createBooking(user.id, req.body);
    sendCreated(res, booking, { message: 'Rental booking request submitted successfully' });
  });

  /**
   * GET /api/v1/bookings
   */
  getBookings = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const result = await this.service.getBookings(user, req.query as unknown as BookingQueryInput);
    sendPaginated(res, result.data, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
      hasNextPage: result.hasNextPage,
      hasPreviousPage: result.hasPreviousPage,
    });
  });

  /**
   * GET /api/v1/bookings/:id
   */
  getBookingById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const booking = await this.service.getBookingById(user, req.params.id as string);
    sendSuccess(res, booking, 200);
  });

  /**
   * GET /api/v1/bookings/:id/history
   */
  getStatusHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const history = await this.service.getStatusHistory(user, req.params.id as string);
    sendSuccess(res, history, 200);
  });

  /**
   * PATCH /api/v1/bookings/:id/approve
   */
  approveBooking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const booking = await this.service.approveBooking(user, req.params.id as string);
    sendSuccess(res, booking, 200, { message: 'Booking approved successfully' });
  });

  /**
   * PATCH /api/v1/bookings/:id/reject
   */
  rejectBooking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const booking = await this.service.rejectBooking(user, req.params.id as string, req.body.rejectionReason || req.body.reason);
    sendSuccess(res, booking, 200, { message: 'Booking rejected successfully' });
  });

  /**
   * PATCH /api/v1/bookings/:id/cancel
   */
  cancelBooking = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const booking = await this.service.cancelBooking(user, req.params.id as string, req.body.reason);
    sendSuccess(res, booking, 200, { message: 'Booking cancelled successfully' });
  });

  /**
   * PATCH /api/v1/bookings/:id/status
   */
  updateBookingStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const booking = await this.service.updateBookingStatus(
      user,
      req.params.id as string,
      req.body.status,
      req.body.reason
    );
    sendSuccess(res, booking, 200, { message: 'Booking status updated successfully' });
  });

  /**
   * GET /api/v1/assets/:id/availability or GET /api/v1/bookings/availability/:id
   */
  getAssetAvailability = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const assetId = req.params.id as string;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const result = await this.service.checkAssetAvailability(assetId, start, end);
    sendSuccess(res, result, 200);
  });

}

export const bookingController = new BookingController();
