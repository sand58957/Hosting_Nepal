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
  BadRequestException,
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
import { GlitchTipService } from './services/glitchtip.service';
import { AdminQueryDto } from './dto/admin-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserFreeDto } from './dto/update-user-free.dto';
import { BulkUserFreeDto } from './dto/bulk-user-free.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly glitchTip: GlitchTipService,
  ) {}

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

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Create a user (admin bypass of public registration)' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUser(@Body() dto: CreateUserDto) {
    this.logger.log(`Admin creating user ${dto.email} with role ${dto.role || 'CUSTOMER'}`);
    return this.adminService.createUser(dto);
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

  @Patch('users/:id/free')
  @HttpCode(HttpStatus.OK)
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'Grant or revoke billing-exempt (free) status for a user — SUPER_ADMIN only',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User free status updated' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async setUserFree(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserFreeDto,
    @CurrentUser() actor: any,
  ) {
    // request.user is the DB user from JwtStrategy.validate (has `id`); fall back
    // to `sub` for safety, matching the pattern used elsewhere (e.g. blog controllers).
    const actingAdminId = actor?.id || actor?.sub;
    this.logger.log(
      `SUPER_ADMIN ${actingAdminId} setting user ${id} isFree=${dto.isFree}`,
    );
    return this.adminService.setUserFree(id, dto, actingAdminId);
  }

  @Post('email-samples')
  @HttpCode(HttpStatus.OK)
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary: 'Send one sample of each transactional email template to an address — SUPER_ADMIN only',
  })
  async sendEmailSamples(@Body() body: { to: string }) {
    if (!body?.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to)) {
      throw new BadRequestException('Valid "to" email required');
    }
    this.logger.log(`Sending email template samples to ${body.to}`);
    return this.adminService.sendEmailSamples(body.to);
  }

  @Post('users/bulk-free')
  @HttpCode(HttpStatus.OK)
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary:
      'Bulk grant/revoke billing-exempt (free) status for many users at once — SUPER_ADMIN only',
  })
  @ApiResponse({ status: 200, description: 'Bulk update applied; returns updated count' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN' })
  async setUsersFreeBulk(@Body() dto: BulkUserFreeDto, @CurrentUser() actor: any) {
    const actingAdminId = actor?.id || actor?.sub;
    this.logger.log(
      `SUPER_ADMIN ${actingAdminId} bulk isFree=${dto.isFree} (scope=${dto.scope || 'ids'}, ids=${dto.userIds?.length ?? 0})`,
    );
    return this.adminService.setUsersFreeBulk(dto, actingAdminId);
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

  // ─── Error Tracking (GlitchTip) — SUPER_ADMIN only ───────────────────────────

  @Get('error-tracking/overview')
  @Roles('SUPER_ADMIN')
  @ApiOperation({
    summary:
      'Error-tracking overview from self-hosted GlitchTip (projects + unresolved issues) — SUPER_ADMIN only',
  })
  @ApiResponse({ status: 200, description: 'Overview, or { configured:false } if GlitchTip env is unset' })
  @ApiResponse({ status: 403, description: 'Forbidden — requires SUPER_ADMIN' })
  getErrorTrackingOverview() {
    return this.glitchTip.getOverview();
  }

  @Get('error-tracking/issues')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'List GlitchTip issues (filterable) — SUPER_ADMIN only' })
  @ApiQuery({ name: 'query', required: false, description: "GlitchTip search, e.g. 'is:unresolved'" })
  @ApiQuery({ name: 'limit', required: false, description: 'Max issues (1–100, default 25)' })
  getErrorTrackingIssues(
    @Query('query') query?: string,
    @Query('limit') limit?: string,
  ) {
    return this.glitchTip.getIssues(query || 'is:unresolved', limit ? Number(limit) : 25);
  }
}
