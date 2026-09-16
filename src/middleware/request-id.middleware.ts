import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

export const REQUEST_ID_HEADER = 'X-Request-ID';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const existingId = req.header(REQUEST_ID_HEADER);
  const requestId = existingId || crypto.randomUUID();

  req.id = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  next();
};
