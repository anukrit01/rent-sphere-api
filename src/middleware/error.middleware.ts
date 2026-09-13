import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/app.error.js';
import { ErrorCode } from '../constants/index.js';
import { ApiResponseError, ApiErrorDetail } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Centralized Global Error Handling Middleware.
 * Catches all errors from async handlers, routes, Prisma, and body parser,
 * logs detailed diagnostics internally, and formats safe, standardized error envelopes.
 */
export const errorHandlerMiddleware: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response<ApiResponseError>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const requestId = req.id || (req.headers['x-request-id'] as string) || 'unknown';

  // 1. AppError (Explicit operational domain errors)
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error(
        {
          requestId,
          err,
          path: req.path,
          method: req.method,
        },
        `Non-operational AppError: ${err.message}`
      );
    } else {
      logger.warn(
        {
          requestId,
          code: err.code,
          statusCode: err.statusCode,
          path: req.path,
          method: req.method,
        },
        `Operational error: ${err.message}`
      );
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || null,
      },
    });
    return;
  }

  // 2. Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    let statusCode = 400;
    let code = ErrorCode.VALIDATION_ERROR;
    let message = 'Database operation error';
    let details: ApiErrorDetail[] | null = null;

    if (err.code === 'P2002') {
      // Unique constraint failed
      statusCode = 409;
      code = ErrorCode.DUPLICATE_RESOURCE;
      const target = Array.isArray(err.meta?.target)
        ? (err.meta.target as string[]).join(', ')
        : (err.meta?.target as string) || 'field';
      message = `A resource with the specified ${target} already exists.`;
      details = [{ field: target, message: `Unique constraint violated on ${target}` }];
    } else if (err.code === 'P2025') {
      // Record not found
      statusCode = 404;
      code = ErrorCode.NOT_FOUND;
      message = (err.meta?.cause as string) || 'The requested record was not found.';
    } else if (err.code === 'P2003') {
      // Foreign key constraint failed
      statusCode = 400;
      code = ErrorCode.VALIDATION_ERROR;
      const field = (err.meta?.field_name as string) || 'foreign_key';
      message = `Invalid relation: referenced record on ${field} does not exist.`;
      details = [{ field, message: 'Foreign key constraint violation' }];
    } else {
      logger.warn(
        {
          requestId,
          prismaCode: err.code,
          meta: err.meta,
        },
        `Prisma database error: ${err.message}`
      );
    }

    res.status(statusCode).json({
      success: false,
      error: { code, message, details },
    });
    return;
  }

  // 3. Prisma Validation Errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.warn({ requestId, err }, 'Prisma client validation error');
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid query parameters or database constraints.',
        details: null,
      },
    });
    return;
  }

  // 4. JSON Body Parser SyntaxError (Malformed JSON payload)
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400 && 'body' in err) {
    res.status(400).json({
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Malformed JSON payload in request body.',
        details: null,
      },
    });
    return;
  }

  // 5. Unhandled Programmer / Internal Server Exceptions
  logger.error(
    {
      requestId,
      err,
      path: req.path,
      method: req.method,
      headers: req.headers,
    },
    `Unhandled server exception: ${err instanceof Error ? err.message : String(err)}`
  );

  const clientMessage =
    env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err instanceof Error
        ? err.message
        : 'Internal server error';

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: clientMessage,
      details: null,
    },
  });
};
