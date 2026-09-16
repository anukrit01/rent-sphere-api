import { Prisma, AuditLog, AuditAction } from '@prisma/client';
import { BaseRepository, PaginatedResult, PaginationOptions } from './base.repository.js';

export type AuditLogWithActor = AuditLog & {
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
};

export interface AuditLogFilterOptions extends PaginationOptions {
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
}

export class AuditLogRepository extends BaseRepository {
  /**
   * Persists an immutable audit log entry.
   */
  async create(data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog> {
    return this.db.auditLog.create({ data });
  }

  /**
   * Retrieves paginated audit logs with actor metadata and filters.
   */
  async findLogs(options: AuditLogFilterOptions = {}): Promise<PaginatedResult<AuditLogWithActor>> {
    const { page, limit, skip, take } = this.calculatePagination(options);

    const where: Prisma.AuditLogWhereInput = {
      ...(options.action ? { action: options.action } : {}),
      ...(options.entityType ? { entityType: options.entityType } : {}),
      ...(options.entityId ? { entityId: options.entityId } : {}),
      ...(options.actorId ? { actorId: options.actorId } : {}),
      ...(options.startDate || options.endDate
        ? {
            createdAt: {
              ...(options.startDate ? { gte: new Date(options.startDate) } : {}),
              ...(options.endDate ? { lte: new Date(options.endDate) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.db.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      this.db.auditLog.count({ where }),
    ]);

    return this.formatPaginatedResult(data as AuditLogWithActor[], total, page, limit);
  }
}

export const auditLogRepository = new AuditLogRepository();
