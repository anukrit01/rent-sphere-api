import request from 'supertest';
import { app } from '../helpers/app.helper.js';
import { prisma } from '../../src/database/prisma.js';
import { getLeaserUser, getRenterUser } from '../helpers/auth.helper.js';
import { AssetStatus } from '@prisma/client';

describe('Double-Booking Prevention (Integration — MANDATORY Section 53)', () => {
  let leaser: any;
  let renterA: any;
  let renterBUser: any;
  let testAsset: any;
  const createdBookingIds: string[] = [];
  const baseOffset = Math.floor(Math.random() * 12000) + 2000;

  beforeAll(async () => {
    leaser = await getLeaserUser();
    renterA = await getRenterUser();
    const category = await prisma.category.findFirstOrThrow();

    // Create unique secondary test renter
    const renterBEmail = `renter_b_${Date.now()}@test.rentsphere.in`;
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Renter B',
        email: renterBEmail,
        password: 'Password@123',
        role: 'RENTER',
      });

    renterBUser = {
      id: regRes.body.data.user.id,
      email: renterBEmail,
      token: regRes.body.data.accessToken,
      headers: { Authorization: `Bearer ${regRes.body.data.accessToken}` },
    };

    // Create available machinery
    testAsset = await prisma.asset.create({
      data: {
        title: `TEST_DOUBLE_BOOK_${Date.now()}`,
        description: 'Machinery to verify double booking rejection',
        pricePerDay: 12000,
        pricePerWeek: 75000,
        securityDeposit: 30000,
        status: AssetStatus.AVAILABLE,
        location: 'Whitefield Industrial Area',
        city: 'Bengaluru',
        state: 'Karnataka',
        pinCode: '560066',
        features: [],
        rentalTerms: [],
        ownerId: leaser.id,
        categoryId: category.id,
      },
    });
  });

  afterAll(async () => {
    for (const id of createdBookingIds) {
      await prisma.bookingStatusHistory.deleteMany({ where: { bookingId: id } });
      await prisma.auditLog.deleteMany({ where: { entityId: id } });
      await prisma.notification.deleteMany({ where: { data: { path: ['bookingId'], equals: id } } });
      await prisma.booking.deleteMany({ where: { id } });
    }
    if (testAsset) {
      await prisma.asset.deleteMany({ where: { id: testAsset.id } });
    }
    if (renterBUser) {
      await prisma.refreshToken.deleteMany({ where: { userId: renterBUser.id } });
      await prisma.auditLog.deleteMany({ where: { entityId: renterBUser.id } });
      await prisma.user.deleteMany({ where: { id: renterBUser.id } });
    }
  });

  it('Scenario 1: Reject overlapping booking when an APPROVED booking already reserves the dates', async () => {
    const d1 = new Date(Date.now() + baseOffset * 24 * 60 * 60 * 1000).toISOString();
    const d2 = new Date(Date.now() + (baseOffset + 6) * 24 * 60 * 60 * 1000).toISOString();

    // Renter A creates booking for [d1, d2]
    const resA = await request(app)
      .post('/api/v1/bookings')
      .set(renterA.headers)
      .send({
        assetId: testAsset.id,
        startDate: d1,
        endDate: d2,
        projectLocation: 'Bangalore Tech Park',
      });

    expect(resA.status).toBe(201);
    const bookingAId = resA.body.data.id;
    createdBookingIds.push(bookingAId);

    // Leaser approves Booking A
    const approveRes = await request(app)
      .patch(`/api/v1/bookings/${bookingAId}/approve`)
      .set(leaser.headers);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // Case 1a: Exact overlapping date range attempt
    const resExact = await request(app)
      .post('/api/v1/bookings')
      .set(renterBUser.headers)
      .send({
        assetId: testAsset.id,
        startDate: d1,
        endDate: d2,
        projectLocation: 'Bangalore Tech Park Block 2',
      });
    expect(resExact.status).toBe(409);
    expect(resExact.body.error.code).toBe('BOOKING_UNAVAILABLE');

    // Case 1b: Partial overlap start [d1 - 2 days, d1 + 2 days]
    const overlapStartD1 = new Date(Date.now() + (baseOffset - 2) * 24 * 60 * 60 * 1000).toISOString();
    const overlapStartD2 = new Date(Date.now() + (baseOffset + 2) * 24 * 60 * 60 * 1000).toISOString();
    const resOverlapStart = await request(app)
      .post('/api/v1/bookings')
      .set(renterBUser.headers)
      .send({
        assetId: testAsset.id,
        startDate: overlapStartD1,
        endDate: overlapStartD2,
        projectLocation: 'Bangalore Outer Ring',
      });
    expect(resOverlapStart.status).toBe(409);
    expect(resOverlapStart.body.error.code).toBe('BOOKING_UNAVAILABLE');

    // Case 1c: Partial overlap end [d2 - 2 days, d2 + 3 days]
    const overlapEndD1 = new Date(Date.now() + (baseOffset + 4) * 24 * 60 * 60 * 1000).toISOString();
    const overlapEndD2 = new Date(Date.now() + (baseOffset + 9) * 24 * 60 * 60 * 1000).toISOString();
    const resOverlapEnd = await request(app)
      .post('/api/v1/bookings')
      .set(renterBUser.headers)
      .send({
        assetId: testAsset.id,
        startDate: overlapEndD1,
        endDate: overlapEndD2,
        projectLocation: 'Bangalore Metro Site',
      });
    expect(resOverlapEnd.status).toBe(409);
    expect(resOverlapEnd.body.error.code).toBe('BOOKING_UNAVAILABLE');

    // Case 1d: Sub-range fully enclosed inside [d1 + 1 day, d2 - 1 day]
    const enclosedD1 = new Date(Date.now() + (baseOffset + 1) * 24 * 60 * 60 * 1000).toISOString();
    const enclosedD2 = new Date(Date.now() + (baseOffset + 4) * 24 * 60 * 60 * 1000).toISOString();
    const resEnclosed = await request(app)
      .post('/api/v1/bookings')
      .set(renterBUser.headers)
      .send({
        assetId: testAsset.id,
        startDate: enclosedD1,
        endDate: enclosedD2,
        projectLocation: 'Enclosed Range Site',
      });
    expect(resEnclosed.status).toBe(409);
    expect(resEnclosed.body.error.code).toBe('BOOKING_UNAVAILABLE');
  });

  it('Scenario 2: Non-overlapping booking date window is accepted successfully', async () => {
    // Booking after original booking has ended [d2 + 5 days, d2 + 8 days]
    const nonOverlapD1 = new Date(Date.now() + (baseOffset + 15) * 24 * 60 * 60 * 1000).toISOString();
    const nonOverlapD2 = new Date(Date.now() + (baseOffset + 18) * 24 * 60 * 60 * 1000).toISOString();

    const resNonOverlap = await request(app)
      .post('/api/v1/bookings')
      .set(renterBUser.headers)
      .send({
        assetId: testAsset.id,
        startDate: nonOverlapD1,
        endDate: nonOverlapD2,
        projectLocation: 'Electronic City Phase 1',
      });

    expect(resNonOverlap.status).toBe(201);
    expect(resNonOverlap.body.data.id).toBeDefined();
    createdBookingIds.push(resNonOverlap.body.data.id);
  });
});
