import { UserRole } from '@prisma/client';
import { AuthUser } from '../middleware/auth.middleware.js';

/**
 * Returns true if the user is an Administrator.
 */
export const isAdmin = (user?: AuthUser): boolean => {
  return user?.role === UserRole.ADMIN;
};

/**
 * Returns true if the user is an Asset Owner / Leaser.
 */
export const isLeaser = (user?: AuthUser): boolean => {
  return user?.role === UserRole.LEASER;
};

/**
 * Returns true if the user is a Contractor / Renter.
 */
export const isRenter = (user?: AuthUser): boolean => {
  return user?.role === UserRole.RENTER;
};

/**
 * Returns true if the user possesses at least one of the specified roles.
 */
export const hasAnyRole = (user: AuthUser | undefined, roles: UserRole[]): boolean => {
  if (!user) return false;
  return roles.includes(user.role);
};
