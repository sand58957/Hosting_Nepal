import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
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
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { ResellerService } from './reseller.service';
import { ApplyResellerDto } from './dto/apply-reseller.dto';
import { UpdateResellerDto } from './dto/update-reseller.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import { UpdateWhiteLabelDto } from './dto/update-white-label.dto';

@ApiTags('Reseller')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reseller')
export class ResellerController {
  private readonly logger = new Logger(ResellerController.name);

  constructor(private readonly resellerService: ResellerService) {}

  // ─── Apply for Reseller Account ───────────────────────────────────────────────

  @Post('apply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Apply for a reseller account',
    description:
      'Submit an application to become a white-label reseller. Application requires admin approval before activation.',
  })
  @ApiResponse({ status: 201, description: 'Reseller application submitted successfully' })
  @ApiResponse({ status: 409, description: 'Reseller account already exists' })
  async applyForReseller(
    @Body() dto: ApplyResellerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.log(`POST /reseller/apply - user ${user.sub}`);
    return this.resellerService.applyForReseller(user.sub, dto);
  }

  // ─── Reseller Profile ─────────────────────────────────────────────────────────

  @Get('profile')
  @ApiOperation({
    summary: 'Get own reseller profile',
    description: 'Retrieve the full reseller profile including branding and configuration.',
  })
  @ApiResponse({ status: 200, description: 'Reseller profile returned successfully' })
  @ApiResponse({ status: 404, description: 'Reseller profile not found' })
  async getResellerProfile(@CurrentUser() user: JwtPayload) {
    this.logger.log(`GET /reseller/profile - user ${user.sub}`);
    return this.resellerService.getResellerProfile(user.sub);
  }

  @Patch('profile')
  @ApiOperation({
    summary: 'Update reseller profile',
    description: 'Update company details, contact information, and other profile fields.',
  })
  @ApiResponse({ status: 200, description: 'Reseller profile updated successfully' })
  @ApiResponse({ status: 404, description: 'Reseller profile not found' })
  async updateResellerProfile(
    @Body() dto: UpdateResellerDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.log(`PATCH /reseller/profile - user ${user.sub}`);
    return this.resellerService.updateResellerProfile(user.sub, dto);
  }

  // ─── Customers ────────────────────────────────────────────────────────────────

  @Get('customers')
  @ApiOperation({
    summary: 'List customers under this reseller',
    description:
      'Retrieve a paginated list of all end-customers who belong to this reseller account.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, max: 100)' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by user status' })
  @ApiResponse({ status: 200, description: 'Customer list returned successfully' })
  @ApiResponse({ status: 403, description: 'Reseller account not active' })
  async getResellerCustomers(
    @CurrentUser() user: JwtPayload,
    @Query() query: { page?: number; limit?: number; status?: string },
  ) {
    this.logger.log(`GET /reseller/customers - user ${user.sub}`);
    return this.resellerService.getResellerCustomers(user.sub, query);
  }

  @Get('customers/:id')
  @ApiOperation({
    summary: 'Get detailed information about a specific customer',
    description: 'Retrieve orders, hosting accounts, and domains for a customer.',
  })
  @ApiParam({ name: 'id', description: 'Customer user ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Customer details returned successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async getCustomerDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.log(`GET /reseller/customers/${id} - user ${user.sub}`);
    // Resolve reseller by userId first, then fetch customer
    const reseller = await this.resellerService.findResellerByUserId(user.sub);
    if (!reseller) {
      return { message: 'Reseller profile not found' };
    }
    return this.resellerService.getCustomerDetails(reseller.id, id);
  }

  // ─── Orders ───────────────────────────────────────────────────────────────────

  @Get('orders')
  @ApiOperation({
    summary: "List orders from the reseller's customers",
    description: 'Get a paginated list of all orders placed by customers under this reseller.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20, max: 100)' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by order status' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Order list returned successfully' })
  async getResellerOrders(
    @CurrentUser() user: JwtPayload,
    @Query()
    query: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    this.logger.log(`GET /reseller/orders - user ${user.sub}`);
    return this.resellerService.getResellerOrders(user.sub, query);
  }

  // ─── Revenue ──────────────────────────────────────────────────────────────────

  @Get('revenue')
  @ApiOperation({
    summary: 'Get revenue report for the reseller',
    description:
      'Aggregated revenue from customer orders with reseller margin calculations and monthly breakdown.',
  })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Report start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Report end date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Revenue report returned successfully' })
  async getResellerRevenue(
    @CurrentUser() user: JwtPayload,
    @Query() query: { startDate?: string; endDate?: string },
  ) {
    this.logger.log(`GET /reseller/revenue - user ${user.sub}`);
    return this.resellerService.getResellerRevenue(user.sub, query);
  }

  // ─── Pricing ──────────────────────────────────────────────────────────────────

  @Get('pricing')
  @ApiOperation({
    summary: 'Get custom pricing rules',
    description:
      'Retrieve the reseller pricing configuration including global markup and per-product overrides.',
  })
  @ApiResponse({ status: 200, description: 'Pricing rules returned successfully' })
  async getResellerPricing(@CurrentUser() user: JwtPayload) {
    this.logger.log(`GET /reseller/pricing - user ${user.sub}`);
    return this.resellerService.getResellerPricing(user.sub);
  }

  @Patch('pricing')
  @ApiOperation({
    summary: 'Update markup pricing rules',
    description:
      'Set global markup percentage and per-product pricing overrides for domains, hosting, and SSL.',
  })
  @ApiResponse({ status: 200, description: 'Pricing rules updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pricing configuration' })
  async updatePricing(
    @Body() dto: UpdatePricingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.log(`PATCH /reseller/pricing - user ${user.sub}`);
    return this.resellerService.updatePricing(user.sub, dto);
  }

  // ─── White Label ──────────────────────────────────────────────────────────────

  @Get('white-label')
  @ApiOperation({
    summary: 'Get white-label branding settings',
    description:
      'Retrieve brand name, logo, custom domain, support email, and other white-label configuration.',
  })
  @ApiResponse({ status: 200, description: 'White-label settings returned successfully' })
  async getWhiteLabel(@CurrentUser() user: JwtPayload) {
    this.logger.log(`GET /reseller/white-label - user ${user.sub}`);
    return this.resellerService.getWhiteLabel(user.sub);
  }

  @Patch('white-label')
  @ApiOperation({
    summary: 'Update white-label branding settings',
    description:
      'Configure brand name, logo URL, custom domain, support email, primary color, and tagline.',
  })
  @ApiResponse({ status: 200, description: 'White-label settings updated successfully' })
  @ApiResponse({ status: 409, description: 'Custom domain already in use' })
  async updateWhiteLabel(
    @Body() dto: UpdateWhiteLabelDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.logger.log(`PATCH /reseller/white-label - user ${user.sub}`);
    return this.resellerService.updateWhiteLabel(user.sub, dto);
  }

  // ─── Balance ──────────────────────────────────────────────────────────────────

  @Get('balance')
  @ApiOperation({
    summary: 'Get reseller credit/wallet balance',
    description:
      'Retrieve the current wallet balance, commission rate, and pricing markup for the reseller.',
  })
  @ApiResponse({ status: 200, description: 'Balance information returned successfully' })
  async getResellerBalance(@CurrentUser() user: JwtPayload) {
    this.logger.log(`GET /reseller/balance - user ${user.sub}`);
    return this.resellerService.getResellerBalance(user.sub);
  }
}
