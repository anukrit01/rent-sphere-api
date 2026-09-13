import { ErrorCode } from '../constants/index.js';
import { ApiErrorDetail } from '../types/index.js';

/**
 * Base Application Error class.
 * All operational domain errors extend this class.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details: ApiErrorDetail[] | null;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    details: ApiErrorDetail[] | null = null,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details: ApiErrorDetail[] | null = null) {
    super(message, 404, ErrorCode.NOT_FOUND, details);
  }
}

/**
 * 400 Bad Request / Validation Error
 */
export class BadRequestError extends AppError {
  constructor(message = 'Invalid request data', details: ApiErrorDetail[] | null = null) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, details);
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details: ApiErrorDetail[] | null = null) {
    super(message, 401, ErrorCode.UNAUTHORIZED, details);
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action', details: ApiErrorDetail[] | null = null) {
    super(message, 403, ErrorCode.FORBIDDEN, details);
  }
}

/**
 * 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict detected', details: ApiErrorDetail[] | null = null) {
    super(message, 409, ErrorCode.CONFLICT, details);
  }
}

/**
 * 409 Duplicate Resource
 */
export class DuplicateResourceError extends AppError {
  constructor(message = 'A resource with these details already exists', details: ApiErrorDetail[] | null = null) {
    super(message, 409, ErrorCode.DUPLICATE_RESOURCE, details);
  }
}

/**
 * 409 Booking Unavailable (Double-booking protection)
 */
export class BookingUnavailableError extends AppError {
  constructor(message = 'The equipment is not available for the selected dates.', details: ApiErrorDetail[] | null = null) {
    super(message, 409, ErrorCode.BOOKING_UNAVAILABLE, details);
  }
}

/**
 * 401 Invalid Credentials
 */
export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid email or password', details: ApiErrorDetail[] | null = null) {
    super(message, 401, ErrorCode.INVALID_CREDENTIALS, details);
  }
}

/**
 * 401 Token Expired
 */
export class TokenExpiredError extends AppError {
  constructor(message = 'Token has expired', details: ApiErrorDetail[] | null = null) {
    super(message, 401, ErrorCode.TOKEN_EXPIRED, details);
  }
}

/**
 * 429 Rate Limited
 */
export class RateLimitedError extends AppError {
  constructor(message = 'Too many requests, please try again later', details: ApiErrorDetail[] | null = null) {
    super(message, 429, ErrorCode.RATE_LIMITED, details);
  }
}

/**
 * 500 Internal Server Error (Programmer / non-operational error)
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details: ApiErrorDetail[] | null = null) {
    super(message, 500, ErrorCode.INTERNAL_ERROR, details, false);
  }
}
