import { z } from 'zod';
import { paginationQuerySchema } from './common.validator.js';

const booleanQueryParam = z.preprocess((val) => {
  if (val === 'true' || val === true) return true;
  if (val === 'false' || val === false) return false;
  return undefined;
}, z.boolean().optional());

export const notificationQuerySchema = paginationQuerySchema.extend({
  isRead: booleanQueryParam,
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
