import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationType, NotificationCategory, UserStatus } from '@prisma/client';
import { GetNotificationsDto } from './dto/get-notifications.dto';

export interface CreateNotificationData {
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface PaginatedNotifications {
  data: Array<{
    id: string;
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    read: boolean;
    sentAt: Date | null;
    readAt: Date | null;
    createdAt: Date;
  }>;
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Get Notifications ──────────────────────────────────────────────────────

  async getMyNotifications(
    userId: string,
    query: GetNotificationsDto,
  ): Promise<PaginatedNotifications> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const unreadOnly = query.unreadOnly ?? false;
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          category: true,
          title: true,
          message: true,
          read: true,
          sentAt: true,
          readAt: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Unread Count ───────────────────────────────────────────────────────────

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  // ─── Mark Single As Read ────────────────────────────────────────────────────

  async markAsRead(id: string, userId: string): Promise<{ success: boolean }> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with id "${id}" not found`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not have permission to update this notification');
    }

    await this.prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    this.logger.log(`Notification ${id} marked as read for user ${userId}`);
    return { success: true };
  }

  // ─── Mark All As Read ───────────────────────────────────────────────────────

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    this.logger.log(`Marked ${result.count} notifications as read for user ${userId}`);
    return { updated: result.count };
  }

  // ─── Delete Notification ────────────────────────────────────────────────────

  async deleteNotification(id: string, userId: string): Promise<{ success: boolean }> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with id "${id}" not found`);
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this notification');
    }

    await this.prisma.notification.delete({ where: { id } });

    this.logger.log(`Notification ${id} deleted by user ${userId}`);
    return { success: true };
  }

  // ─── Create Single Notification ─────────────────────────────────────────────

  async createNotification(
    userId: string,
    data: CreateNotificationData,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: data.type,
        category: data.category,
        title: data.title,
        message: data.message,
        sentAt: new Date(),
      },
    });

    this.logger.log(
      `Notification created for user ${userId}: [${data.category}] ${data.title}`,
    );
    return notification;
  }

  // ─── Bulk Notifications ─────────────────────────────────────────────────────

  async sendBulkNotification(
    userIds: string[],
    data: CreateNotificationData,
  ): Promise<{ created: number }> {
    if (userIds.length === 0) {
      return { created: 0 };
    }

    const now = new Date();
    const notifications = userIds.map((userId) => ({
      userId,
      type: data.type,
      category: data.category,
      title: data.title,
      message: data.message,
      sentAt: now,
    }));

    const result = await this.prisma.notification.createMany({
      data: notifications,
      skipDuplicates: false,
    });

    this.logger.log(
      `Bulk notification sent to ${result.count} users: [${data.category}] ${data.title}`,
    );
    return { created: result.count };
  }

  // ─── System Notification ────────────────────────────────────────────────────

  async sendSystemNotification(
    title: string,
    message: string,
    category: NotificationCategory,
  ): Promise<{ created: number }> {
    const activeUsers = await this.prisma.user.findMany({
      where: { status: UserStatus.ACTIVE },
      select: { id: true },
    });

    const userIds = activeUsers.map((u) => u.id);

    if (userIds.length === 0) {
      this.logger.warn('sendSystemNotification: no active users found');
      return { created: 0 };
    }

    return this.sendBulkNotification(userIds, {
      type: NotificationType.IN_APP,
      category,
      title,
      message,
    });
  }
}
