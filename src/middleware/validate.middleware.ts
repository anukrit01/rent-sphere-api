import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../errors/app.error.js';
import { ApiErrorDetail } from '../types/index.js';

export interface ValidationTargetSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Formats Zod validation issues into structured ApiErrorDetail objects.
 */
export const formatZodErrors = (error: ZodError): ApiErrorDetail[] => {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : undefined,
    message: issue.message,
    code: issue.code,
  }));
};

/**
 * Higher-order middleware to validate incoming request data using Zod.
 * Validates and reassigns sanitized/coerced values to req.body, req.query, and req.params.
 */
export const validateRequest = (schemas: ValidationTargetSchemas): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(req.params)) as Record<string, string>;
      }

      if (schemas.query) {
        req.query = (await schemas.query.parseAsync(req.query)) as Record<string, any>;
      }

      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = formatZodErrors(err);
        next(new BadRequestError('Validation failed', details));
        return;
      }

      next(err);
    }
  };
};
