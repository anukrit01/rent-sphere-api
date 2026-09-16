import request from 'supertest';
import { app } from '../helpers/app.helper.js';
import { prisma } from '../../src/database/prisma.js';
import { getLeaserUser, getRenterUser } from '../helpers/auth.helper.js';
import { AssetStatus } from '@prisma/client';

describe('Booking API (Integration)', () => {
  let leaser: any;
  let renter: any;
  let testAsset: any;
  let createdBookingId = '';
  const baseOffset = Math.floor(Math.random() * 8000) + 1500;

  beforeAll(async () => {
    leaser = await getLeaserUser();
    renter = await getRenterUser();
    const category = await prisma.category.findFirstOrThrow();

    testAsset = await prisma.asset.create({
      data: {
        title: `TEST_BOOKING_ASSET_${Date.now()}`,
        description: 'Asset for booking lifecycle testing',
        pricePerDay: 10000,
        pricePerWeek: 60000,
        securityDeposit: 25000,
        status: AssetStatus.AVAILABLE,
        location: 'Kurla West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400070',
        features: [],
        rentalTerms: [],
        ownerId: leaser.id,
        categoryId: category.id,
      },
    });
  });

  afterAll(async () => {
    if (createdBookingId) {
      await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: createdBookingId } });
      await prisma.auditLog.deleteMany({ where: { entityId: createdBookingId } });
      await prisma.notification.deleteMany({ where: { data: { path: ['bookingId'], equals: createdBookingId } } });
      await prisma.booking.deleteMany({ where: { id: createdBookingId } });
    }
    if (testAsset) {
      await prisma.asset.deleteMany({ where: { id: testAsset.id } });
    }
  });

  describe('POST /api/v1/bookings', () => {
    it('should prevent equipment owner from booking their own asset', async () => {
      const d1 = new Date(Date.now() + baseOffset * 24 * 60 * 60 * 1000).toISOString();
      const d2 = new Date(Date.now() + (baseOffset + 3) * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/bookings')
        .set(leaser.headers)
        .send({
          assetId: testAsset.id,
          startDate: d1,
          endDate: d2,
          projectLocation: 'Kurla Site',
        });

      expect(res.status).toBe(400);
    });

    it('should create a booking in PENDING status with correct total calculation', async () => {
      const d1 = new Date(Date.now() + baseOffset * 24 * 60 * 60 * 1000).toISOString();
      const d2 = new Date(Date.now() + (baseOffset + 4) * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/v1/bookings')
        .set(renter.headers)
        .send({
          assetId: testAsset.id,
          startDate: d1,
          endDate: d2,
          projectLocation: 'BKC Commercial Hub Plot 14',
          projectDescription: 'Foundation excavation and grading work',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.dailyRate).toBe(10000);
      expect(res.body.data.securityDeposit).toBe(25000);
      expect(res.body.data.rentalSubtotal).toBe(40000);

      createdBookingId = res.body.data.id;
    });
  });

  describe('PATCH /api/v1/bookings/:id/approve', () => {
    it('should return 403 when user other than asset owner attempts approval', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${createdBookingId}/approve`)
        .set(renter.headers);

      expect(res.status).toBe(403);
    });

    it('should approve booking when called by equipment owner', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${createdBookingId}/approve`)
        .set(leaser.headers);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('APPROVED');
    });
  });

  describe('PATCH /api/v1/bookings/:id/cancel', () => {
    it('should allow renter to cancel their booking', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${createdBookingId}/cancel`)
        .set(renter.headers)
        .send({ reason: 'Project schedule modified' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
    });
  });
});
