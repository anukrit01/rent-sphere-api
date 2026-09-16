import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { validateRequest } from '../../src/middleware/validate.middleware.js';
import { z } from 'zod';
import { BadRequestError } from '../../src/errors/app.error.js';

describe('Validation Middleware (Unit)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: any;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  it('should validate and pass when body satisfies schema', async () => {
    const schema = z.object({
      name: z.string().min(2),
      age: z.number().min(18),
    });

    mockReq.body = { name: 'John Doe', age: 25 };
    const middleware = validateRequest({ body: schema });

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockReq.body).toEqual({ name: 'John Doe', age: 25 });
  });

  it('should call next with BadRequestError when body fails schema constraints', async () => {
    const schema = z.object({
      email: z.string().email(),
      price: z.number().positive(),
    });

    mockReq.body = { email: 'not-an-email', price: -50 };
    const middleware = validateRequest({ body: schema });

    await middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError));
  });
});
