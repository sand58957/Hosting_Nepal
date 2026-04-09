import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { NotificationService } from './notification.service';
import { GetNotificationsDto } from './dto/get-notifications.dto';

interface AuthenticatedRequest extends Request {
  user: { id: string; email: string; role: string };
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  // ─── Get My Notifications ───────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get my notifications with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: 'Filter unread only' })
  @ApiResponse({ status: 200, description: 'Paginated list of notifications' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyNotifications(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetNotificationsDto,
  ) {
    const userId = req.user.id;
    this.logger.log(`User ${userId} fetching notifications`);
    return this.notificationService.getMyNotifications(userId, query);
  }

  // ─── Get Unread Count ───────────────────────────────────────────────────────

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread notification count' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return this.notificationService.getUnreadCount(userId);
  }

  // ─── Mark All As Read ───────────────────────────────────────────────────────

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllAsRead(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    this.logger.log(`User ${userId} marking all notifications as read`);
    return this.notificationService.markAllAsRead(userId);
  }

  // ─── Mark Single As Read ────────────────────────────────────────────────────

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    this.logger.log(`User ${userId} marking notification ${id} as read`);
    return this.notificationService.markAsRead(id, userId);
  }

  // ─── Delete Notification ────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.id;
    this.logger.log(`User ${userId} deleting notification ${id}`);
    return this.notificationService.deleteNotification(id, userId);
  }
}
