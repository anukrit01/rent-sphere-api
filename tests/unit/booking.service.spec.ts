import { bookingService } from '../../src/services/booking.service.js';
import { prisma } from '../../src/database/prisma.js';
import { BadRequestError, NotFoundError } from '../../src/errors/app.error.js';

describe('BookingService (Unit)', () => {
  let testAsset: any;

  beforeAll(async () => {
    testAsset = await prisma.asset.findFirst({
      where: { status: 'AVAILABLE' },
    });
  });

  describe('calculateBookingCost', () => {
    it('should throw NotFoundError if asset does not exist', async () => {
      await expect(
        bookingService.calculateBookingCost({
          assetId: '00000000-0000-0000-0000-000000000000',
          startDate: new Date('2027-01-01'),
          endDate: new Date('2027-01-05'),
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should correctly calculate rental duration and subtotal when valid dates given', async () => {
      if (!testAsset) return;

      const duration = Math.max(7, (testAsset.minimumRentalDays || 1) + 1);
      const startDate = new Date('2027-02-01');
      const endDate = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);

      const cost = await bookingService.calculateBookingCost({
        assetId: testAsset.id,
        startDate,
        endDate,
      });

      expect(cost.durationDays).toBe(duration);
      expect(cost.dailyRate).toBe(testAsset.pricePerDay);
      expect(cost.rentalSubtotal).toBe(testAsset.pricePerDay * duration);
      expect(cost.securityDeposit).toBe(testAsset.securityDeposit);
      expect(cost.estimatedTotal).toBeGreaterThanOrEqual(cost.rentalSubtotal);
    });
  });

  describe('createBooking Self-Booking Guard', () => {
    it('should reject booking when owner attempts to book their own equipment', async () => {
      if (!testAsset) return;

      await expect(
        bookingService.createBooking(testAsset.ownerId, {
          assetId: testAsset.id,
          startDate: new Date('2027-03-01'),
          endDate: new Date('2027-03-05'),
        })
      ).rejects.toThrow(BadRequestError);
    });
  });
});
