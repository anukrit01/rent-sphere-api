import { Prisma, Notification } from '@prisma/client';
import { BaseRepository, PaginatedResult, PaginationOptions } from './base.repository.js';

export interface NotificationFilterOptions extends PaginationOptions {
  isRead?: boolean;
}

export class NotificationRepository extends BaseRepository {
  /**
   * Creates a notification record.
   */
  async create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification> {
    return this.db.notification.create({ data });
  }

  /**
   * Finds paginated notifications for a specific user, optionally filtered by isRead.
   */
  async findUserNotifications(
    userId: string,
    options: NotificationFilterOptions = {}
  ): Promise<PaginatedResult<Notification>> {
    const { page, limit, skip, take } = this.calculatePagination(options);

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(options.isRead !== undefined ? { isRead: options.isRead } : {}),
    };

    const [data, total] = await Promise.all([
      this.db.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.notification.count({ where }),
    ]);

    return this.formatPaginatedResult(data, total, page, limit);
  }

  /**
   * Counts unread notifications for a user.
   */
  async countUnread(userId: string): Promise<number> {
    return this.db.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Finds a notification by ID.
   */
  async findById(id: string): Promise<Notification | null> {
    return this.db.notification.findUnique({
      where: { id },
    });
  }

  /**
   * Marks a single notification as read.
   */
  async markAsRead(id: string): Promise<Notification> {
    return this.db.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Marks all unread notifications for a user as read.
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    return this.db.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  }
}

export const notificationRepository = new NotificationRepository();
