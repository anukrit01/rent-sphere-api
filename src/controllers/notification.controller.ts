import { Request, Response } from 'express';
import { notificationService, NotificationService } from '../services/notification.service.js';
import { sendSuccess } from '../utils/response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { AuthUser } from '../middleware/auth.middleware.js';
import { NotificationQueryInput } from '../validators/notification.validator.js';

export class NotificationController {
  constructor(private readonly service: NotificationService = notificationService) {}

  /**
   * GET /api/v1/notifications
   */
  getUserNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const query = req.query as unknown as NotificationQueryInput;
    const result = await this.service.getUserNotifications(user.id, query);

    res.status(200).json({
      success: true,
      data: result.data,
      unreadCount: result.unreadCount,
      meta: {
        unreadCount: result.unreadCount,
      },
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPreviousPage: result.hasPreviousPage,
      },
    });
  });

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  markAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const notificationId = req.params.id as string;
    const updated = await this.service.markAsRead(user.id, notificationId);
    sendSuccess(res, updated, 200, { message: 'Notification marked as read' });
  });

  /**
   * PATCH /api/v1/notifications/read-all
   */
  markAllAsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = req.user as AuthUser;
    const result = await this.service.markAllAsRead(user.id);
    sendSuccess(res, result, 200, { message: 'All notifications marked as read' });
  });
}

export const notificationController = new NotificationController();
