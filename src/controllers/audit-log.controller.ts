import { Request, Response } from 'express';
import { auditLogService, AuditLogService } from '../services/audit-log.service.js';
import { sendPaginated } from '../utils/response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AuditLogQueryInput } from '../validators/audit-log.validator.js';

export class AuditLogController {
  constructor(private readonly service: AuditLogService = auditLogService) {}

  /**
   * GET /api/v1/admin/audit-logs
   */
  getAuditLogs = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = req.query as unknown as AuditLogQueryInput;
    const paginated = await this.service.getAuditLogs(query);
    sendPaginated(res, paginated.data, {
      page: paginated.page,
      limit: paginated.limit,
      total: paginated.total,
      totalPages: paginated.totalPages,
      hasNextPage: paginated.hasNextPage,
      hasPreviousPage: paginated.hasPreviousPage,
    });
  });
}

export const auditLogController = new AuditLogController();
