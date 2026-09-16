import { AuditAction, Prisma } from '@prisma/client';
import {
  auditLogRepository,
  AuditLogRepository,
  AuditLogFilterOptions,
  AuditLogWithActor,
} from '../repositories/audit-log.repository.js';
import { PaginatedResult } from '../repositories/base.repository.js';
import { AuditLogQueryInput } from '../validators/audit-log.validator.js';
import { logger } from '../utils/logger.js';

export interface FormattedAuditLog {
  id: string;
  actorId: string | null;
  actor?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  createdAt: string;
}

export class AuditLogService {
  constructor(private readonly auditRepo: AuditLogRepository = auditLogRepository) {}

  /**
   * Records an audit event asynchronously.
   * Credential sanitization is enforced: passwords and tokens are never stored.
   * Wrapped in try/catch to avoid breaking core business workflows on audit failures.
   */
  async log(
    actorId: string | null,
    action: AuditAction,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      // Credential sanitization invariant
      const sanitizedMeta = metadata ? this.sanitizeMetadata(metadata) : undefined;

      await this.auditRepo.create({
        actorId,
        action,
        entityType,
        entityId,
        metadata: sanitizedMeta ? (sanitizedMeta as Prisma.InputJsonValue) : Prisma.JsonNull,
      });
    } catch (error) {
      logger.error({ actorId, action, entityType, entityId, error }, 'Failed to record audit log');
    }
  }

  /**
   * Retrieves paginated audit logs for administrators.
   */
  async getAuditLogs(query: AuditLogQueryInput): Promise<PaginatedResult<FormattedAuditLog>> {
    const options: AuditLogFilterOptions = {
      page: query.page,
      limit: query.limit,
      action: query.action,
      entityType: query.entityType,
      entityId: query.entityId,
      actorId: query.actorId,
      startDate: query.startDate,
      endDate: query.endDate,
    };

    const result = await this.auditRepo.findLogs(options);
    return {
      ...result,
      data: result.data.map((log) => this.formatAuditLog(log)),
    };
  }

  /**
   * Sanitizes metadata to guarantee credentials and tokens are never persisted.
   */
  private sanitizeMetadata(meta: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = new Set([
      'password',
      'passwordhash',
      'token',
      'accesstoken',
      'refreshtoken',
      'authorization',
      'secret',
    ]);

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(meta)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private formatAuditLog(log: AuditLogWithActor): FormattedAuditLog {
    return {
      id: log.id,
      actorId: log.actorId,
      actor: log.actor,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata ?? undefined,
      createdAt: log.createdAt.toISOString(),
    };
  }
}

export const auditLogService = new AuditLogService();
