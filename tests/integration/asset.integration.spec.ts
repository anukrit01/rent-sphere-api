import request from 'supertest';
import { app } from '../helpers/app.helper.js';
import { prisma } from '../../src/database/prisma.js';
import { getAdminUser, getLeaserUser, getRenterUser } from '../helpers/auth.helper.js';

describe('Asset API (Integration)', () => {
  let admin: any;
  let leaser: any;
  let renter: any;
  let categoryId: string;
  let createdAssetId = '';
  const prefix = `TEST_ASSET_${Date.now()}_`;

  beforeAll(async () => {
    admin = await getAdminUser();
    leaser = await getLeaserUser();
    renter = await getRenterUser();

    const category = await prisma.category.findFirstOrThrow();
    categoryId = category.id;
  });

  afterAll(async () => {
    if (createdAssetId) {
      await prisma.assetImage.deleteMany({ where: { assetId: createdAssetId } });
      await prisma.auditLog.deleteMany({ where: { entityId: createdAssetId } });
      await prisma.notification.deleteMany({ where: { data: { path: ['assetId'], equals: createdAssetId } } });
      await prisma.asset.deleteMany({ where: { id: createdAssetId } });
    }
  });

  describe('POST /api/v1/assets (Creation & RBAC)', () => {
    it('should return 403 Forbidden when a RENTER attempts to list machinery', async () => {
      const res = await request(app)
        .post('/api/v1/assets')
        .set(renter.headers)
        .send({
          title: `${prefix}Renter Attempt`,
          description: 'Renter listing machinery',
          categoryId,
          pricePerDay: 10000,
          securityDeposit: 20000,
          location: 'Andheri East',
          city: 'Mumbai',
          state: 'Maharashtra',
          specification: { brand: 'CAT', model: '320', year: 2022 },
        });

      expect(res.status).toBe(403);
    });

    it('should return 201 Created with status PENDING_REVIEW when a LEASER lists machinery', async () => {
      const res = await request(app)
        .post('/api/v1/assets')
        .set(leaser.headers)
        .send({
          title: `${prefix}Bulldozer D6`,
          tagline: 'High capacity crawler bulldozer',
          description: 'High capacity crawler bulldozer for earthmoving and site grading',
          categoryId,
          pricePerDay: 18000,
          pricePerWeek: 110000,
          securityDeposit: 50000,
          location: 'Hadapsar Industrial Estate',
          city: 'Pune',
          state: 'Maharashtra',
          pinCode: '411028',
          specification: {
            brand: 'Caterpillar',
            model: 'D6T',
            year: 2021,
            operatingWeight: '18 tons',
          },
          images: [
            { url: 'https://images.rentsphere.in/bulldozer-1.jpg', isCover: true, sortOrder: 0 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('PENDING_REVIEW');
      expect(res.body.data.pricePerDay).toBe(18000);

      createdAssetId = res.body.data.id;
    });
  });

  describe('GET /api/v1/assets (Search & Listing)', () => {
    it('should return 200 OK with paginated machinery listings', async () => {
      const res = await request(app).get('/api/v1/assets?page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter public machinery by category and city', async () => {
      const res = await request(app).get(`/api/v1/assets?categoryId=${categoryId}&city=Mumbai`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Admin Moderation (Approve / Reject)', () => {
    it('should return 403 Forbidden when non-admin tries to approve machinery', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/assets/${createdAssetId}/approve`)
        .set(leaser.headers);

      expect(res.status).toBe(403);
    });

    it('should approve machinery successfully when called by ADMIN', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/assets/${createdAssetId}/approve`)
        .set(admin.headers);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('AVAILABLE');
    });

    it('should reject machinery when called by ADMIN with moderation reason', async () => {
      const rejectAssetRes = await request(app)
        .post('/api/v1/assets')
        .set(leaser.headers)
        .send({
          title: `${prefix}To Reject`,
          description: 'Machinery with incomplete documentation submitted for review',
          categoryId,
          pricePerDay: 12000,
          securityDeposit: 25000,
          location: 'MIDC Industrial Area',
          city: 'Nagpur',
          state: 'Maharashtra',
          specification: { brand: 'JCB', model: '3DX', year: 2020 },
        });

      const rejectAssetId = rejectAssetRes.body.data.id;

      const res = await request(app)
        .patch(`/api/v1/admin/assets/${rejectAssetId}/reject`)
        .set(admin.headers)
        .send({
          reason: 'Incomplete insurance and fitness certificates',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('REJECTED');

      // Cleanup
      await prisma.auditLog.deleteMany({ where: { entityId: rejectAssetId } });
      await prisma.notification.deleteMany({ where: { data: { path: ['assetId'], equals: rejectAssetId } } });
      await prisma.asset.deleteMany({ where: { id: rejectAssetId } });
    });
  });

  describe('GET /api/v1/assets/:id (Post-Approval Details)', () => {
    it('should return 200 OK with detailed machinery specifications and owner for approved asset', async () => {
      const res = await request(app).get(`/api/v1/assets/${createdAssetId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdAssetId);
      expect(res.body.data.owner).toBeDefined();
      expect(res.body.data.category).toBeDefined();
    });

    it('should return 404 Not Found for non-existent asset ID', async () => {
      const res = await request(app).get('/api/v1/assets/00000000-0000-0000-0000-000000000000');
      expect(res.status).toBe(404);
    });
  });
});
