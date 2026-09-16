import request from 'supertest';
import { app } from '../helpers/app.helper.js';
import { prisma } from '../../src/database/prisma.js';
import { getRenterUser } from '../helpers/auth.helper.js';

describe('Favorites API (Integration)', () => {
  let renter: any;
  let testAsset: any;

  beforeAll(async () => {
    renter = await getRenterUser();
    testAsset = await prisma.asset.findFirstOrThrow();
  });

  afterAll(async () => {
    await prisma.favorite.deleteMany({
      where: {
        userId: renter.id,
        assetId: testAsset.id,
      },
    });
  });

  it('should add an asset to favorites via POST /api/v1/assets/:id/favorite', async () => {
    const res = await request(app)
      .post(`/api/v1/assets/${testAsset.id}/favorite`)
      .set(renter.headers);

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });

  it('should check if asset is favorited via GET /api/v1/assets/:id/favorite', async () => {
    const res = await request(app)
      .get(`/api/v1/assets/${testAsset.id}/favorite`)
      .set(renter.headers);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isFavorite).toBe(true);
  });

  it('should retrieve user favorites list via GET /api/v1/users/me/favorites', async () => {
    const res = await request(app)
      .get('/api/v1/users/me/favorites')
      .set(renter.headers);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const hasAsset = res.body.data.some((item: any) => item.id === testAsset.id);
    expect(hasAsset).toBe(true);
  });

  it('should remove an asset from favorites via DELETE /api/v1/assets/:id/favorite', async () => {
    const res = await request(app)
      .delete(`/api/v1/assets/${testAsset.id}/favorite`)
      .set(renter.headers);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
