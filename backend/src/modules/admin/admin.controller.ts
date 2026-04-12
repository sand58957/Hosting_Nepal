import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
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
import { AdminService } from './admin.service';
import { AdminQueryDto } from './dto/admin-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiOperation({ summary: 'Get platform overview dashboard stats' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getDashboardStats() {
    this.logger.log('Admin fetching dashboard stats');
    return this.adminService.getDashboardStats();
  }

  // ─── Users ──────────────────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated users list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllUsers(@Query() query: AdminQueryDto) {
    return this.adminService.getAllUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get detailed user profile with all relations' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User details with all relations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user status (active/suspended/etc.)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User status updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    this.logger.log(`Admin updating user ${id} status to ${dto.status}`);
    return this.adminService.updateUserStatus(id, dto);
  }

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user role' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { role: string },
  ) {
    this.logger.log(`Admin updating user ${id} role to ${body.role}`);
    return this.adminService.updateUserRole(id, body.role);
  }

  @Get('users-analytics')
  @ApiOperation({ summary: 'Get user analytics overview' })
  async getUserAnalytics() {
    return this.adminService.getUserAnalytics();
  }

  // ─── Orders ─────────────────────────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({ summary: 'List all orders across all users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated orders list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllOrders(@Query() query: AdminQueryDto) {
    return this.adminService.getAllOrders(query);
  }

  // ─── Payments ───────────────────────────────────────────────────────────────

  @Get('payments')
  @ApiOperation({ summary: 'List all payments across all users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated payments list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllPayments(@Query() query: AdminQueryDto) {
    return this.adminService.getAllPayments(query);
  }

  // ─── Domains ────────────────────────────────────────────────────────────────

  @Get('domains')
  @ApiOperation({ summary: 'List all domains across all users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated domains list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllDomains(@Query() query: AdminQueryDto) {
    return this.adminService.getAllDomains(query);
  }

  // ─── Hosting ─────────────────────────────────────────────────────────────────

  @Get('hosting')
  @ApiOperation({ summary: 'List all hosting accounts across all users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated hosting accounts list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllHosting(@Query() query: AdminQueryDto) {
    return this.adminService.getAllHosting(query);
  }

  // ─── Support Tickets ────────────────────────────────────────────────────────

  @Get('support')
  @ApiOperation({ summary: 'List all support tickets' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated support tickets list' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllTickets(@Query() query: AdminQueryDto) {
    return this.adminService.getAllTickets(query);
  }

  @Patch('support/:id/assign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a support ticket to an agent' })
  @ApiParam({ name: 'id', description: 'Support ticket UUID' })
  @ApiResponse({ status: 200, description: 'Ticket assigned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Ticket or agent not found' })
  async assignTicket(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignTicketDto,
  ) {
    this.logger.log(`Admin assigning ticket ${id} to agent ${dto.agentId}`);
    return this.adminService.assignTicket(id, dto.agentId);
  }

  // ─── Revenue ─────────────────────────────────────────────────────────────────

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue summary aggregated by day/week/month' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'groupBy', required: false, type: String, enum: ['day', 'week', 'month'] })
  @ApiResponse({ status: 200, description: 'Revenue summary data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRevenueSummary(@Query() query: AdminQueryDto) {
    return this.adminService.getRevenueSummary(query);
  }

  // ─── Promo Codes ─────────────────────────────────────────────────────────────

  @Post('promo-codes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new promo code' })
  @ApiResponse({ status: 201, description: 'Promo code created successfully' })
  @ApiResponse({ status: 400, description: 'Promo code already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPromoCode(@Body() dto: CreatePromoCodeDto) {
    this.logger.log(`Admin creating promo code: ${dto.code}`);
    return this.adminService.createPromoCode(dto);
  }

  @Get('promo-codes')
  @ApiOperation({ summary: 'List all promo codes' })
  @ApiResponse({ status: 200, description: 'List of promo codes' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPromoCodes() {
    return this.adminService.getPromoCodes();
  }

  @Patch('promo-codes/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a promo code' })
  @ApiParam({ name: 'id', description: 'Promo code UUID' })
  @ApiResponse({ status: 200, description: 'Promo code updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Promo code not found' })
  async updatePromoCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreatePromoCodeDto>,
  ) {
    this.logger.log(`Admin updating promo code ${id}`);
    return this.adminService.updatePromoCode(id, dto);
  }

  @Delete('promo-codes/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a promo code' })
  @ApiParam({ name: 'id', description: 'Promo code UUID' })
  @ApiResponse({ status: 200, description: 'Promo code deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Promo code not found' })
  async deletePromoCode(@Param('id', ParseUUIDPipe) id: string) {
    this.logger.log(`Admin deleting promo code ${id}`);
    return this.adminService.deletePromoCode(id);
  }

  // ─── Broadcast Notification ─────────────────────────────────────────────────

  @Post('notifications/broadcast')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Broadcast notification to all active users' })
  @ApiResponse({ status: 201, description: 'Notification broadcast successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async broadcastNotification(@Body() dto: BroadcastNotificationDto) {
    this.logger.log(`Admin broadcasting notification: [${dto.category}] ${dto.title}`);
    return this.adminService.broadcastNotification(dto.title, dto.message, dto.category);
  }

  // ─── Site Config ────────────────────────────────────────────────────────────

  @Get('site-config')
  @ApiOperation({ summary: 'Get site configuration (WhatsApp number, etc.)' })
  async getSiteConfig() {
    return this.adminService.getSiteConfig();
  }

  @Patch('site-config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update site configuration' })
  async updateSiteConfig(@Body() config: Record<string, any>) {
    this.logger.log('Admin updating site config');
    return this.adminService.updateSiteConfig(config);
  }
}
