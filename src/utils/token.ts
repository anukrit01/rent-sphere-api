import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { UnauthorizedError, TokenExpiredError } from '../errors/app.error.js';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  jti?: string;
}

/**
 * Signs a short-lived access token JWT (15 minutes).
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

/**
 * Signs a longer-lived refresh token JWT (7 days) with a unique cryptographical jti (RFC 7519).
 * Guarantees every generated token is globally unique to enable secure token rotation.
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    jwtid: crypto.randomUUID(),
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
};

/**
 * Verifies an access token and returns decoded claims.
 */
export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload & { exp: number };
    return {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError('Access token has expired');
    }
    throw new UnauthorizedError('Invalid access token');
  }
};

/**
 * Verifies a refresh token and returns decoded claims.
 */
export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload & { exp: number; jti?: string };
    return {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      jti: decoded.jti,
    };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError('Refresh token has expired');
    }
    throw new UnauthorizedError('Invalid refresh token');
  }
};

/**
 * Calculates Date timestamp 7 days in the future for refresh token persistence.
 */
export const getRefreshTokenExpiryDate = (): Date => {
  const now = new Date();
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
};
