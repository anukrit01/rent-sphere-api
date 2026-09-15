import { z } from 'zod';
import { paginationQuerySchema } from './common.validator.js';

export const favoriteQuerySchema = paginationQuerySchema;

export type FavoriteQueryInput = z.infer<typeof favoriteQuerySchema>;
