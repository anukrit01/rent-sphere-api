import request from 'supertest';
import { app } from '../helpers/app.helper.js';
import { prisma } from '../../src/database/prisma.js';
import { getLeaserUser, getRenterUser } from '../helpers/auth.helper.js';
import { AssetStatus, BookingStatus } from '@prisma/client';

describe('Reviews API (Integration)', () => {
  let leaser: any;
  let renter: any;
  let testAsset: any;
  let completedBooking: any;
  let createdReviewId = '';

  beforeAll(async () => {
    leaser = await getLeaserUser();
    renter = await getRenterUser();
    const category = await prisma.category.findFirstOrThrow();

    testAsset = await prisma.asset.create({
      data: {
        title: `TEST_REVIEW_ASSET_${Date.now()}`,
        description: 'Asset for testing review ratings',
        pricePerDay: 15000,
        pricePerWeek: 90000,
        securityDeposit: 20000,
        status: AssetStatus.AVAILABLE,
        location: 'Guindy Industrial Estate',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pinCode: '600032',
        features: [],
        rentalTerms: [],
        ownerId: leaser.id,
        categoryId: category.id,
      },
    });

    const d1 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const d2 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    completedBooking = await prisma.booking.create({
      data: {
        assetId: testAsset.id,
        renterId: renter.id,
        startDate: d1,
        endDate: d2,
        durationDays: 3,
        dailyRate: 15000,
        rentalSubtotal: 45000,
        securityDeposit: 20000,
        estimatedTotal: 65000,
        status: BookingStatus.COMPLETED,
        projectLocation: 'Chennai Metro Phase 2',
      },
    });
  });

  afterAll(async () => {
    if (createdReviewId) {
      await prisma.notification.deleteMany({ where: { data: { path: ['reviewId'], equals: createdReviewId } } });
      await prisma.review.deleteMany({ where: { id: createdReviewId } });
    }
    if (completedBooking) {
      await prisma.booking.deleteMany({ where: { id: completedBooking.id } });
    }
    if (testAsset) {
      await prisma.asset.deleteMany({ where: { id: testAsset.id } });
    }
  });

  it('should post a review successfully for a COMPLETED booking and recalculate rating', async () => {
    const res = await request(app)
      .post(`/api/v1/assets/${testAsset.id}/reviews`)
      .set(renter.headers)
      .send({
        bookingId: completedBooking.id,
        rating: 5,
        comment: 'Outstanding machinery condition, fully serviced with great fuel efficiency!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.rating).toBe(5);

    createdReviewId = res.body.data.id;

    // Verify updated rating and count on asset
    const updatedAsset = await prisma.asset.findUnique({ where: { id: testAsset.id } });
    expect(updatedAsset?.rating).toBe(5);
    expect(updatedAsset?.reviewCount).toBe(1);
  });

  it('should reject duplicate review for the same booking with 400 Bad Request', async () => {
    const res = await request(app)
      .post(`/api/v1/assets/${testAsset.id}/reviews`)
      .set(renter.headers)
      .send({
        bookingId: completedBooking.id,
        rating: 4,
        comment: 'Attempting duplicate review for the same completed rental',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('already been reviewed');
  });

  it('should retrieve public reviews for the asset via GET /api/v1/assets/:id/reviews', async () => {
    const res = await request(app).get(`/api/v1/assets/${testAsset.id}/reviews`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
