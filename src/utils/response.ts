import { Response } from 'express';
import { ApiResponseSuccess, PaginatedResponse, PaginationMeta } from '../types/index.js';

/**
 * Sends a standardized 200 OK (or custom success code) JSON envelope.
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>
): Response<ApiResponseSuccess<T>> => {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
};

/**
 * Sends a standardized 201 Created JSON envelope.
 */
export const sendCreated = <T>(
  res: Response,
  data: T,
  meta?: Record<string, unknown>
): Response<ApiResponseSuccess<T>> => {
  return sendSuccess(res, data, 201, meta);
};

/**
 * Sends a standardized 204 No Content response.
 */
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

/**
 * Sends a standardized Paginated response envelope.
 */
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta
): Response<PaginatedResponse<T>> => {
  return res.status(200).json({
    success: true,
    data,
    pagination,
  });
};

/**
 * Utility to strip sensitive fields (e.g., password) from a database model instance.
 */
export const excludeFields = <T, Key extends keyof T>(record: T, keys: Key[]): Omit<T, Key> => {
  if (!record || typeof record !== 'object') return record;
  const clone = { ...record };
  for (const key of keys) {
    delete clone[key];
  }
  return clone;
};

/**
 * Utility to strip sensitive fields from an array of database model instances.
 */
export const excludeFieldsMany = <T, Key extends keyof T>(records: T[], keys: Key[]): Omit<T, Key>[] => {
  return records.map((r) => excludeFields(r, keys));
};
