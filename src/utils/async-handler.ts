import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncExpressHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/**
 * Wraps an async Express controller method to automatically catch Promise rejections
 * and route them to next(error), eliminating boilerplate try/catch blocks.
 */
export const asyncHandler = (fn: AsyncExpressHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
