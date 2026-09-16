import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../src/middleware/auth.middleware.js';
import { authorize } from '../../src/middleware/authorize.middleware.js';
import { UserRole } from '@prisma/client';
import { generateAccessToken } from '../../src/utils/token.js';
import { UnauthorizedError, ForbiddenError } from '../../src/errors/app.error.js';

describe('Auth & Authorize Middleware (Unit)', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      headers: {},
      cookies: {},
      header(name: string) {
        return this.headers[name.toLowerCase()] || this.headers[name];
      },
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('should call next with UnauthorizedError when no token is present', async () => {
      await authenticate(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should call next with UnauthorizedError when Authorization header is not Bearer', async () => {
      mockReq.headers = { authorization: 'Basic dXNlcjpwYXNz' };
      await authenticate(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('should set req.user and call next() without error when valid Bearer token provided', async () => {
      const token = generateAccessToken({
        sub: 'user-uuid-123',
        email: 'test@example.com',
        role: UserRole.RENTER,
      });

      mockReq.headers = { authorization: `Bearer ${token}` };
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user?.id).toBe('user-uuid-123');
      expect(mockReq.user?.email).toBe('test@example.com');
      expect(mockReq.user?.role).toBe(UserRole.RENTER);
      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('authorize', () => {
    it('should call next() without error when user role matches allowed roles', () => {
      mockReq.user = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      const guard = authorize(UserRole.ADMIN);
      guard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should call next with ForbiddenError when user role is not allowed', () => {
      mockReq.user = {
        id: 'renter-1',
        email: 'renter@example.com',
        role: UserRole.RENTER,
      };

      const guard = authorize(UserRole.ADMIN, UserRole.LEASER);
      guard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should call next with UnauthorizedError when req.user is undefined', () => {
      mockReq.user = undefined;
      const guard = authorize(UserRole.ADMIN);
      guard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });
});
