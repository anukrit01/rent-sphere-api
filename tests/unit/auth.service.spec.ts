import { authService } from '../../src/services/auth.service.js';
import { prisma } from '../../src/database/prisma.js';
import { UserRole } from '@prisma/client';
import { DuplicateResourceError, InvalidCredentialsError, ForbiddenError, UnauthorizedError } from '../../src/errors/app.error.js';

describe('AuthService (Unit)', () => {
  const testEmail = `unit_test_${Date.now()}@test.rentsphere.in`;
  let createdUserId = '';
  let validRefreshToken = '';

  afterAll(async () => {
    if (createdUserId) {
      await prisma.refreshToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.auditLog.deleteMany({ where: { entityId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }
  });

  describe('register', () => {
    it('should register a new user, hash password, and omit password from returned user', async () => {
      const result = await authService.register({
        name: 'Unit Tester',
        email: testEmail,
        password: 'Password@123',
        role: UserRole.RENTER,
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail);
      expect(result.user.role).toBe(UserRole.RENTER);
      expect((result.user as any).password).toBeUndefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      createdUserId = result.user.id;

      // Verify in DB that password was hashed
      const dbUser = await prisma.user.findUnique({ where: { id: createdUserId } });
      expect(dbUser).toBeDefined();
      expect(dbUser?.password).not.toBe('Password@123');
      expect(dbUser?.password.startsWith('$2')).toBe(true);
    });

    it('should throw DuplicateResourceError when attempting to register duplicate email', async () => {
      await expect(
        authService.register({
          name: 'Duplicate Tester',
          email: testEmail,
          password: 'Password@123',
          role: UserRole.RENTER,
        })
      ).rejects.toThrow(DuplicateResourceError);
    });
  });

  describe('login', () => {
    it('should login successfully with correct credentials and return tokens', async () => {
      const result = await authService.login({
        email: testEmail,
        password: 'Password@123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(testEmail);
      expect((result.user as any).password).toBeUndefined();

      validRefreshToken = result.refreshToken;
    });

    it('should throw InvalidCredentialsError when given wrong password', async () => {
      await expect(
        authService.login({
          email: testEmail,
          password: 'WrongPassword@999',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw InvalidCredentialsError when given non-existent email', async () => {
      await expect(
        authService.login({
          email: 'nonexistent_user_999@test.rentsphere.in',
          password: 'Password@123',
        })
      ).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw ForbiddenError when user account is deactivated (isActive = false)', async () => {
      // Deactivate user
      await prisma.user.update({
        where: { id: createdUserId },
        data: { isActive: false },
      });

      await expect(
        authService.login({
          email: testEmail,
          password: 'Password@123',
        })
      ).rejects.toThrow(ForbiddenError);

      // Reactivate for cleanup
      await prisma.user.update({
        where: { id: createdUserId },
        data: { isActive: true },
      });
    });
  });

  describe('refresh', () => {
    it('should refresh tokens when provided valid refresh token', async () => {
      const result = await authService.refresh(validRefreshToken);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe(createdUserId);
    });

    it('should throw UnauthorizedError when refresh token is malformed', async () => {
      await expect(authService.refresh('invalid.fake.jwt.token')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getCurrentUser', () => {
    it('should retrieve current user profile without exposing password', async () => {
      const user = await authService.getCurrentUser(createdUserId);
      expect(user.id).toBe(createdUserId);
      expect(user.email).toBe(testEmail);
      expect((user as any).password).toBeUndefined();
    });
  });
});
