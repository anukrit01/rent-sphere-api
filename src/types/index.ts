import { ErrorCode } from '../constants/index.js';

export interface ApiResponseSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiResponseError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[] | null;
  };
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}
