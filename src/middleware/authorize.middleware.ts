import { Request, Response, NextFunction, RequestHandler } from 'express';
import { UserRole } from '@prisma/client';
import { UnauthorizedError, ForbiddenError, NotFoundError } from '../errors/app.error.js';
import { isAdmin } from '../utils/rbac.js';

export type ResourceOwnerResolver = (
  req: Request
) => Promise<string | null | undefined> | string | null | undefined;

/**
 * Role-Based Access Control (RBAC) route guard.
 * Requires an authenticated user and verifies that the user's role is permitted.
 */
export const authorize = (...roles: UserRole[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      next(
        new ForbiddenError(
          `Access forbidden: required role is one of [${roles.join(', ')}], but current role is '${req.user.role}'`
        )
      );
      return;
    }

    next();
  };
};

/**
 * Resource Ownership authorization guard.
 * Resolves the owner ID of a target resource and ensures:
 * 1. The authenticated user is the resource owner, OR
 * 2. The authenticated user is an Administrator (admin override).
 */
export const requireOwnership = (getOwnerId: ResourceOwnerResolver): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    // Administrators bypass resource ownership for governance & audits
    if (isAdmin(req.user)) {
      next();
      return;
    }

    try {
      const ownerId = await getOwnerId(req);

      if (ownerId === null || ownerId === undefined) {
        next(new NotFoundError('Resource not found'));
        return;
      }

      if (req.user.id !== ownerId) {
        next(
          new ForbiddenError('You do not have permission to access or modify this resource')
        );
        return;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
