import { z } from 'zod';
import { AuditAction } from '@prisma/client';
import { paginationQuerySchema } from './common.validator.js';

export const auditLogQuerySchema = paginationQuerySchema.extend({
  action: z.nativeEnum(AuditAction).optional(),
  entityType: z.string().trim().optional(),
  entityId: z.string().trim().optional(),
  actorId: z.string().uuid({ message: 'actorId must be a valid UUID' }).optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
