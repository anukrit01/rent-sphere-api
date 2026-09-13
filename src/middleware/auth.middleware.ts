import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UserRole } from '@prisma/client';
import { verifyAccessToken } from '../utils/token.js';
import { UnauthorizedError } from '../errors/app.error.js';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware that validates the incoming Bearer access token,
 * verifies signature and expiration, and binds req.user.
 */
export const authenticate: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    next(new UnauthorizedError('Authorization header missing'));
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    next(new UnauthorizedError('Invalid authorization header format. Expected Bearer <token>'));
    return;
  }

  const token = parts[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (err) {
    next(err);
  }
};
