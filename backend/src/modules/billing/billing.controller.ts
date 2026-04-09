import {
  Controller,
  Get,
  Post,
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
import { PaymentGateway } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { TopupWalletDto } from './dto/topup-wallet.dto';
import { ValidatePromoDto } from './dto/validate-promo.dto';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(private readonly billingService: BillingService) {}

  // ─── Orders ────────────────────────────────────────────────────────────────────

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new order (single or bundle)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async createOrder(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrderDto,
  ) {
    return this.billingService.createOrder(user.sub, dto);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List user orders' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'serviceType', required: false, type: String })
  async getOrders(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('serviceType') serviceType?: string,
  ) {
    return this.billingService.getOrders(user.sub, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      serviceType,
    });
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order details' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async getOrderById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billingService.getOrderById(user.sub, id);
  }

  @Post('orders/:id/pay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate payment for an order' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async initiatePayment(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.billingService.initiatePayment(
      user.sub,
      id,
      dto.gateway,
      dto.returnUrl,
    );
  }

  @Post('orders/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a pending order' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async cancelOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billingService.cancelOrder(user.sub, id);
  }

  @Post('orders/:id/upgrade')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upgrade an order to a new plan' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async upgradePlan(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpgradePlanDto,
  ) {
    return this.billingService.upgradePlan(user.sub, id, dto);
  }

  @Post('orders/:id/renew')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renew an order' })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  async renewOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billingService.renewOrder(user.sub, id);
  }

  // ─── Invoices ──────────────────────────────────────────────────────────────────

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List user invoices' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getInvoices(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.billingService.getInvoices(user.sub, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invoice details' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  async getInvoiceById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billingService.getInvoiceById(user.sub, id);
  }

  @Get('invoices/:id/pdf')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invoice PDF data' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  async getInvoicePdf(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billingService.generateInvoicePdf(user.sub, id);
  }

  // ─── Payment Webhooks (no auth guard — use gateway signature verification) ────

  @Post('payments/webhook/khalti')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Khalti payment callback webhook' })
  async khaltiWebhook(@Body() body: Record<string, unknown>) {
    this.logger.log('Received Khalti webhook callback');
    return this.billingService.processPaymentWebhook(
      'KHALTI' as PaymentGateway,
      body,
    );
  }

  @Post('payments/webhook/esewa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'eSewa payment callback webhook' })
  async esewaWebhook(@Body() body: Record<string, unknown>) {
    this.logger.log('Received eSewa webhook callback');
    return this.billingService.processPaymentWebhook(
      'ESEWA' as PaymentGateway,
      body,
    );
  }

  @Post('payments/webhook/connectips')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ConnectIPS payment callback webhook' })
  async connectipsWebhook(@Body() body: Record<string, unknown>) {
    this.logger.log('Received ConnectIPS webhook callback');
    // ConnectIPS callbacks are handled differently - typically verified server-side
    // The callback data contains the transaction status
    const data: Record<string, unknown> = {
      ...body,
      gatewayTransactionId: body.TXNID || body.txnId,
      gatewayReference: body.REFERENCEID || body.referenceId,
    };
    return this.billingService.processPaymentWebhook(
      'BANK_TRANSFER' as PaymentGateway,
      data,
    );
  }

  // ─── Payment History ───────────────────────────────────────────────────────────

  @Get('payments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPayments(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billingService.getPaymentHistory(user.sub, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // ─── Wallet ────────────────────────────────────────────────────────────────────

  @Get('wallet/balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet balance' })
  async getWalletBalance(@CurrentUser() user: JwtPayload) {
    return this.billingService.getWalletBalance(user.sub);
  }

  @Post('wallet/topup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Top up wallet balance' })
  async topupWallet(
    @CurrentUser() user: JwtPayload,
    @Body() dto: TopupWalletDto,
  ) {
    return this.billingService.topupWallet(user.sub, dto.amount, dto.gateway);
  }

  // ─── Promo Codes ───────────────────────────────────────────────────────────────

  @Post('promo/validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a promo code' })
  async validatePromoCode(@Body() dto: ValidatePromoDto) {
    return this.billingService.validatePromoCode(
      dto.code,
      dto.serviceType,
      dto.amount,
    );
  }

  // ─── Transactions ──────────────────────────────────────────────────────────────

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTransactions(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.billingService.getTransactionHistory(user.sub, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
