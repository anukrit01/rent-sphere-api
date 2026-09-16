import request from 'supertest';
import { app } from '../helpers/app.helper.js';
import { prisma } from '../../src/database/prisma.js';
import { getAdminUser, getRenterUser } from '../helpers/auth.helper.js';

describe('Auth API (Integration)', () => {
  const uniqueSuffix = Date.now();
  const testUser = {
    name: 'Integration User',
    email: `int_user_${uniqueSuffix}@test.rentsphere.in`,
    password: 'Password@123',
    role: 'RENTER',
  };
  let registeredUserId = '';
  let refreshTokenCookie = '';
  let refreshTokenValue = '';

  afterAll(async () => {
    if (registeredUserId) {
      await prisma.refreshToken.deleteMany({ where: { userId: registeredUserId } });
      await prisma.auditLog.deleteMany({ where: { entityId: registeredUserId } });
      await prisma.user.deleteMany({ where: { id: registeredUserId } });
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully and return 201 Created', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.accessToken).toBeDefined();

      registeredUserId = res.body.data.user.id;
    });

    it('should return 409 Conflict when attempting to register duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_RESOURCE');
    });

    it('should return 400 Bad Request when password does not meet criteria', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Bad Password',
          email: `bad_pass_${uniqueSuffix}@test.rentsphere.in`,
          password: '123',
          role: 'RENTER',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials and return 200 OK', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      refreshTokenValue = res.body.data.refreshToken;

      const cookies = res.headers['set-cookie'];
      if (cookies) {
        refreshTokenCookie = cookies.find((c: string) => c.startsWith('refreshToken=')) || '';
      }
    });

    it('should return 401 Unauthorized for incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword@999',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 403 Forbidden when user account is deactivated', async () => {
      await prisma.user.update({
        where: { id: registeredUserId },
        data: { isActive: false },
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      // Reactivate
      await prisma.user.update({
        where: { id: registeredUserId },
        data: { isActive: true },
      });
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens when providing valid refreshToken', async () => {
      const req = request(app).post('/api/v1/auth/refresh');
      if (refreshTokenCookie) {
        req.set('Cookie', refreshTokenCookie);
      } else {
        req.send({ refreshToken: refreshTokenValue });
      }

      const res = await req;
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 Unauthorized when no Authorization header provided', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return 200 OK with user profile when authenticated', async () => {
      const renter = await getRenterUser();
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set(renter.headers);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(renter.email);
    });
  });
});
