import { Notification, NotificationType, Prisma } from '@prisma/client';
import {
  notificationRepository,
  NotificationRepository,
  NotificationFilterOptions,
} from '../repositories/notification.repository.js';
import { NotFoundError, ForbiddenError } from '../errors/app.error.js';
import { PaginatedResult } from '../repositories/base.repository.js';
import { NotificationQueryInput } from '../validators/notification.validator.js';
import { logger } from '../utils/logger.js';

export interface FormattedNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  data?: unknown;
  createdAt: string;
}

export interface UserNotificationsResult extends PaginatedResult<FormattedNotification> {
  unreadCount: number;
}

export class NotificationService {
  constructor(private readonly notificationRepo: NotificationRepository = notificationRepository) {}

  /**
   * Asynchronously sends a notification to a specific user.
   * Silently catches and logs failures to avoid disrupting parent workflows.
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Prisma.InputJsonValue
  ): Promise<Notification | null> {
    try {
      return await this.notificationRepo.create({
        userId,
        type,
        title,
        message,
        data: data ?? Prisma.JsonNull,
      });
    } catch (error) {
      logger.error({ userId, type, error }, 'Failed to dispatch notification');
      return null;
    }
  }

  /**
   * Fetches paginated notifications and total unread count for a user.
   */
  async getUserNotifications(
    userId: string,
    query: NotificationQueryInput
  ): Promise<UserNotificationsResult> {
    const filterOptions: NotificationFilterOptions = {
      page: query.page,
      limit: query.limit,
      isRead: query.isRead,
    };

    const [paginated, unreadCount] = await Promise.all([
      this.notificationRepo.findUserNotifications(userId, filterOptions),
      this.notificationRepo.countUnread(userId),
    ]);

    return {
      ...paginated,
      data: paginated.data.map((n) => this.formatNotification(n)),
      unreadCount,
    };
  }

  /**
   * Marks a specific notification as read after checking ownership.
   */
  async markAsRead(userId: string, notificationId: string): Promise<FormattedNotification> {
    const notification = await this.notificationRepo.findById(notificationId);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenError('You do not have permission to access this notification');
    }

    const updated = await this.notificationRepo.markAsRead(notificationId);
    return this.formatNotification(updated);
  }

  /**
   * Marks all unread notifications for a user as read.
   */
  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.notificationRepo.markAllAsRead(userId);
    return { updatedCount: result.count };
  }

  private formatNotification(notification: Notification): FormattedNotification {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      data: notification.data ?? undefined,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}

export const notificationService = new NotificationService();
