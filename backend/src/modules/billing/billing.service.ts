import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../database/prisma.service';
import { KhaltiService } from './services/khalti.service';
import { EsewaService } from './services/esewa.service';
import { ConnectIpsService } from './services/connectips.service';
import { InvoiceService, InvoicePdfData } from './services/invoice.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';
import {
  PaymentGateway,
  PaymentStatus,
  OrderStatus,
  InvoiceStatus,
  DiscountType,
  PromoStatus,
  ServiceType,
} from '@prisma/client';
import {
  VAT_RATE,
  ORDER_NUMBER_PREFIX,
  BILLING_QUEUES,
  BILLING_JOBS,
  BILLING_EVENTS,
  PAYMENT_EXPIRY_MINUTES,
} from './billing.constants';
import { PaymentVerifyResult } from './interfaces/payment-gateway.interface';

interface PaginationOptions {
  page?: number;
  limit?: number;
  status?: string;
  serviceType?: string;
}

export interface PromoValidationResult {
  valid: boolean;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
  message?: string;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly khaltiService: KhaltiService,
    private readonly esewaService: EsewaService,
    private readonly connectIpsService: ConnectIpsService,
    private readonly invoiceService: InvoiceService,
    @InjectQueue(BILLING_QUEUES.PAYMENT) private readonly paymentQueue: Queue,
  ) {
    this.appUrl = this.configService.get<string>('APP_URL', 'https://hostingnepal.com');
  }

  // ─── Order Management ──────────────────────────────────────────────────────────

  async createOrder(userId: string, dto: CreateOrderDto) {
    const orderNumber = await this.generateOrderNumber();

    // Calculate subtotal from all items
    let subtotal = 0;
    for (const item of dto.items) {
      const quantity = item.quantity || 1;
      subtotal += item.amountNpr * quantity * item.durationMonths;
    }

    // Apply promo code discount
    let discountAmount = 0;
    if (dto.promoCode) {
      const promoResult = await this.validatePromoCode(
        dto.promoCode,
        dto.items[0].serviceType,
        subtotal,
      );

      if (!promoResult.valid) {
        throw new BadRequestException(promoResult.message || 'Invalid promo code');
      }

      discountAmount = promoResult.discountAmount || 0;
    }

    const taxableAmount = Math.max(subtotal - discountAmount, 0);
    const vatAmount = Math.round(taxableAmount * VAT_RATE * 100) / 100;
    const totalAmount = Math.round((taxableAmount + vatAmount) * 100) / 100;

    // Use a transaction for consistency
    const result = await this.prisma.$transaction(async (tx) => {
      // For bundles, create an order per item; for a single item, create one order
      // We keep one primary order, and link items via notes for simplicity
      // since the schema has single serviceType per order
      const primaryItem = dto.items[0];

      const order = await tx.order.create({
        data: {
          userId,
          orderNumber,
          serviceType: primaryItem.serviceType,
          planName: primaryItem.planName,
          durationMonths: primaryItem.durationMonths,
          amountNpr: subtotal,
          vatAmountNpr: vatAmount,
          totalAmountNpr: totalAmount,
          discountAmountNpr: discountAmount,
          promoCode: dto.promoCode || null,
          status: 'PENDING',
          notes: dto.items.length > 1
            ? JSON.stringify(
                dto.items.map((item) => ({
                  serviceType: item.serviceType,
                  planName: item.planName,
                  domainName: item.domainName,
                  durationMonths: item.durationMonths,
                  quantity: item.quantity || 1,
                  amountNpr: item.amountNpr,
                })),
              )
            : dto.notes || null,
        },
      });

      // Increment promo code usage
      if (dto.promoCode) {
        await tx.promoCode.updateMany({
          where: { code: dto.promoCode.toUpperCase() },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Generate invoice
      const invoice = await this.invoiceService.generateInvoice(
        order.id,
        userId,
        subtotal,
        discountAmount,
      );

      return { order, invoice };
    });

    this.logger.log(
      `Order ${orderNumber} created for user ${userId}. Total: ${totalAmount} NPR`,
    );

    return {
      order: result.order,
      invoice: result.invoice,
    };
  }

  async getOrders(userId: string, options: PaginationOptions) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };

    if (options.status) {
      where.status = options.status as OrderStatus;
    }
    if (options.serviceType) {
      where.serviceType = options.serviceType as ServiceType;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
          invoices: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payments: { orderBy: { createdAt: 'desc' } },
        invoices: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }

  // ─── Payment Initiation ────────────────────────────────────────────────────────

  async initiatePayment(
    userId: string,
    orderId: string,
    gateway: PaymentGateway,
    returnUrl?: string,
  ) {
    const order = await this.getOrderById(userId, orderId);

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot initiate payment for order with status ${order.status}`,
      );
    }

    // Check for existing pending payment and expire it
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        orderId,
        status: 'PENDING',
      },
    });

    if (existingPayment) {
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: { status: 'EXPIRED' },
      });
    }

    // Handle wallet payment directly
    if (gateway === 'WALLET') {
      return this.processWalletPayment(userId, order);
    }

    const baseReturnUrl =
      returnUrl || `${this.appUrl}/billing/payment/callback`;
    const callbackUrl = `${baseReturnUrl}?orderId=${orderId}&gateway=${gateway}`;

    // Fetch user info for gateway
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    });

    const paymentParams = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.totalAmountNpr,
      customerName: user?.name,
      customerEmail: user?.email,
      customerPhone: user?.phone || undefined,
      returnUrl: callbackUrl,
      websiteUrl: this.appUrl,
    };

    let gatewayResult;

    switch (gateway) {
      case 'KHALTI':
        gatewayResult = await this.khaltiService.initiatePayment(paymentParams);
        break;
      case 'ESEWA':
        gatewayResult = await this.esewaService.initiatePayment(paymentParams);
        break;
      default:
        throw new BadRequestException(`Payment gateway ${gateway} is not supported for online payments`);
    }

    if (!gatewayResult.success) {
      throw new BadRequestException(
        gatewayResult.error || 'Payment initiation failed',
      );
    }

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        userId,
        gateway,
        gatewayTransactionId: gatewayResult.gatewayTransactionId || null,
        gatewayReference: gatewayResult.gatewayReference || null,
        amountNpr: order.totalAmountNpr,
        status: 'PENDING',
        paymentUrl: gatewayResult.paymentUrl || null,
      },
    });

    // Schedule payment expiry check
    await this.paymentQueue.add(
      BILLING_JOBS.PAYMENT_EXPIRY_CHECK,
      { paymentId: payment.id },
      { delay: PAYMENT_EXPIRY_MINUTES * 60 * 1000 },
    );

    this.logger.log(
      `Payment initiated for order ${order.orderNumber} via ${gateway}. Payment ID: ${payment.id}`,
    );

    return {
      paymentId: payment.id,
      paymentUrl: gatewayResult.paymentUrl,
      formData: gatewayResult.formData,
      gateway,
      expiresInMinutes: PAYMENT_EXPIRY_MINUTES,
    };
  }

  private async processWalletPayment(
    userId: string,
    order: { id: string; orderNumber: string; totalAmountNpr: number },
  ) {
    // Check wallet balance from Reseller or a wallet concept
    // We use the Reseller model's walletBalanceNpr for resellers,
    // for regular users, we track via payment records with gateway=WALLET
    const reseller = await this.prisma.reseller.findUnique({
      where: { userId },
    });

    const walletBalance = reseller?.walletBalanceNpr || 0;

    if (walletBalance < order.totalAmountNpr) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ${walletBalance} NPR, Required: ${order.totalAmountNpr} NPR`,
      );
    }

    // Deduct from wallet and complete payment in transaction
    await this.prisma.$transaction(async (tx) => {
      if (reseller) {
        await tx.reseller.update({
          where: { userId },
          data: {
            walletBalanceNpr: { decrement: order.totalAmountNpr },
          },
        });
      }

      await tx.payment.create({
        data: {
          orderId: order.id,
          userId,
          gateway: 'WALLET',
          amountNpr: order.totalAmountNpr,
          status: 'COMPLETED',
          verifiedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'COMPLETED' },
      });

      // Mark related invoices as paid
      await tx.invoice.updateMany({
        where: { orderId: order.id, status: { not: 'CANCELLED' } },
        data: { status: 'PAID', paidAt: new Date() },
      });
    });

    this.eventEmitter.emit(BILLING_EVENTS.ORDER_PAID, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId,
      gateway: 'WALLET',
      amount: order.totalAmountNpr,
    });

    this.logger.log(
      `Wallet payment completed for order ${order.orderNumber}`,
    );

    return {
      paymentId: null,
      paymentUrl: null,
      formData: null,
      gateway: 'WALLET' as PaymentGateway,
      status: 'COMPLETED',
    };
  }

  // ─── Payment Webhook Processing ────────────────────────────────────────────────

  async processPaymentWebhook(
    gateway: PaymentGateway,
    data: Record<string, unknown>,
  ) {
    this.logger.log(`Processing ${gateway} webhook`);

    let verifyResult: PaymentVerifyResult;

    switch (gateway) {
      case 'KHALTI': {
        const pidx = data.pidx as string;
        if (!pidx) {
          throw new BadRequestException('Missing pidx in Khalti callback');
        }
        verifyResult = await this.khaltiService.verifyPayment({
          gatewayTransactionId: pidx,
        });
        break;
      }
      case 'ESEWA': {
        const encodedData = data.data as string;
        if (!encodedData) {
          throw new BadRequestException('Missing data in eSewa callback');
        }
        verifyResult = await this.esewaService.verifyPayment({ encodedData });
        break;
      }
      default:
        throw new BadRequestException(`Unsupported gateway for webhook: ${gateway}`);
    }

    if (!verifyResult.transactionId && !verifyResult.refId) {
      this.logger.error(`No transaction reference found in ${gateway} webhook`);
      throw new BadRequestException('Invalid payment callback data');
    }

    // Find the payment record
    const payment = await this.prisma.payment.findFirst({
      where: {
        gateway,
        status: 'PENDING',
        OR: [
          { gatewayTransactionId: verifyResult.refId || verifyResult.transactionId },
          { gatewayReference: verifyResult.refId || verifyResult.transactionId },
        ],
      },
      include: { order: true },
    });

    if (!payment) {
      this.logger.warn(
        `No pending payment found for ${gateway} transaction ${verifyResult.transactionId || verifyResult.refId}`,
      );
      throw new NotFoundException('Payment record not found');
    }

    if (verifyResult.success && verifyResult.status === 'COMPLETED') {
      // Verify amount matches
      if (verifyResult.amount && Math.abs(verifyResult.amount - payment.amountNpr) > 1) {
        this.logger.error(
          `Amount mismatch for payment ${payment.id}: expected ${payment.amountNpr}, got ${verifyResult.amount}`,
        );
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            callbackData: (verifyResult.rawResponse as Record<string, string>) || undefined,
          },
        });
        throw new BadRequestException('Payment amount mismatch');
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            gatewayTransactionId:
              verifyResult.transactionId || payment.gatewayTransactionId,
            verifiedAt: new Date(),
            callbackData: (verifyResult.rawResponse as Record<string, string>) || undefined,
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: 'COMPLETED', paymentId: payment.id },
        });

        await tx.invoice.updateMany({
          where: { orderId: payment.orderId, status: { not: 'CANCELLED' } },
          data: { status: 'PAID', paidAt: new Date() },
        });
      });

      this.eventEmitter.emit(BILLING_EVENTS.ORDER_PAID, {
        orderId: payment.orderId,
        orderNumber: payment.order.orderNumber,
        userId: payment.userId,
        gateway,
        amount: payment.amountNpr,
        paymentId: payment.id,
      });

      this.logger.log(
        `Payment ${payment.id} completed for order ${payment.order.orderNumber}`,
      );

      return { status: 'COMPLETED', orderId: payment.orderId };
    } else {
      // Payment failed
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          callbackData: (verifyResult.rawResponse as Record<string, string>) || undefined,
        },
      });

      this.eventEmitter.emit(BILLING_EVENTS.PAYMENT_FAILED, {
        orderId: payment.orderId,
        orderNumber: payment.order.orderNumber,
        userId: payment.userId,
        gateway,
        paymentId: payment.id,
        reason: verifyResult.error,
      });

      // Add to dunning queue for retry
      await this.paymentQueue.add(
        BILLING_JOBS.PAYMENT_RETRY,
        {
          orderId: payment.orderId,
          userId: payment.userId,
          attempt: 1,
        },
        { delay: 3 * 24 * 60 * 60 * 1000 }, // Retry after 3 days
      );

      this.logger.warn(
        `Payment ${payment.id} failed for order ${payment.order.orderNumber}: ${verifyResult.error}`,
      );

      return { status: 'FAILED', orderId: payment.orderId };
    }
  }

  // ─── Order Actions ─────────────────────────────────────────────────────────────

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.getOrderById(userId, orderId);

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending orders can be cancelled',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      // Cancel related invoices
      await tx.invoice.updateMany({
        where: { orderId, status: { in: ['DRAFT', 'SENT'] } },
        data: { status: 'CANCELLED' },
      });

      // Expire any pending payments
      await tx.payment.updateMany({
        where: { orderId, status: 'PENDING' },
        data: { status: 'EXPIRED' },
      });

      // Restore promo code usage
      if (order.promoCode) {
        await tx.promoCode.updateMany({
          where: { code: order.promoCode },
          data: { usedCount: { decrement: 1 } },
        });
      }
    });

    this.eventEmitter.emit(BILLING_EVENTS.ORDER_CANCELLED, {
      orderId,
      orderNumber: order.orderNumber,
      userId,
    });

    this.logger.log(`Order ${order.orderNumber} cancelled by user ${userId}`);

    return { message: 'Order cancelled successfully' };
  }

  async upgradePlan(userId: string, orderId: string, dto: UpgradePlanDto) {
    const order = await this.getOrderById(userId, orderId);

    if (order.status !== 'COMPLETED' && order.status !== 'PROCESSING') {
      throw new BadRequestException(
        'Only active/completed orders can be upgraded',
      );
    }

    // Calculate proration: remaining value of current plan
    const orderCreatedAt = order.createdAt;
    const totalDays = order.durationMonths * 30;
    const daysUsed = Math.floor(
      (Date.now() - orderCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const daysRemaining = Math.max(totalDays - daysUsed, 0);
    const dailyRate = order.amountNpr / totalDays;
    const creditAmount = Math.round(dailyRate * daysRemaining * 100) / 100;

    // New plan cost
    const newSubtotal = dto.newPlanAmountNpr * dto.newDurationMonths;
    const proratedAmount = Math.max(newSubtotal - creditAmount, 0);
    const vatAmount = Math.round(proratedAmount * VAT_RATE * 100) / 100;
    const totalAmount = Math.round((proratedAmount + vatAmount) * 100) / 100;

    // Create upgrade order
    const upgradeOrderNumber = await this.generateOrderNumber();

    const upgradeOrder = await this.prisma.order.create({
      data: {
        userId,
        orderNumber: upgradeOrderNumber,
        serviceType: order.serviceType,
        serviceId: order.serviceId,
        planName: dto.newPlanName,
        durationMonths: dto.newDurationMonths,
        amountNpr: proratedAmount,
        vatAmountNpr: vatAmount,
        totalAmountNpr: totalAmount,
        discountAmountNpr: creditAmount,
        status: 'PENDING',
        notes: JSON.stringify({
          type: 'upgrade',
          previousOrderId: orderId,
          previousPlan: order.planName,
          creditAmount,
          daysRemaining,
        }),
      },
    });

    // Generate invoice for the upgrade
    await this.invoiceService.generateInvoice(
      upgradeOrder.id,
      userId,
      proratedAmount,
      0,
    );

    this.logger.log(
      `Upgrade order ${upgradeOrderNumber} created. Credit: ${creditAmount}, New total: ${totalAmount}`,
    );

    return {
      upgradeOrder,
      proration: {
        previousPlan: order.planName,
        newPlan: dto.newPlanName,
        daysRemaining,
        creditAmount,
        newSubtotal,
        proratedAmount,
        vatAmount,
        totalAmount,
      },
    };
  }

  async renewOrder(userId: string, orderId: string) {
    const order = await this.getOrderById(userId, orderId);

    if (!['COMPLETED', 'FAILED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException(
        'Only completed, failed, or cancelled orders can be renewed',
      );
    }

    const renewalOrderNumber = await this.generateOrderNumber();
    const vatAmount = Math.round(order.amountNpr * VAT_RATE * 100) / 100;
    const totalAmount = Math.round((order.amountNpr + vatAmount) * 100) / 100;

    const renewalOrder = await this.prisma.order.create({
      data: {
        userId,
        orderNumber: renewalOrderNumber,
        serviceType: order.serviceType,
        serviceId: order.serviceId,
        planName: order.planName,
        durationMonths: order.durationMonths,
        amountNpr: order.amountNpr,
        vatAmountNpr: vatAmount,
        totalAmountNpr: totalAmount,
        discountAmountNpr: 0,
        status: 'PENDING',
        notes: JSON.stringify({
          type: 'renewal',
          previousOrderId: orderId,
        }),
      },
    });

    await this.invoiceService.generateInvoice(
      renewalOrder.id,
      userId,
      order.amountNpr,
      0,
    );

    this.logger.log(
      `Renewal order ${renewalOrderNumber} created for original order ${order.orderNumber}`,
    );

    return renewalOrder;
  }

  // ─── Invoice Management ────────────────────────────────────────────────────────

  async getInvoices(userId: string, options: PaginationOptions) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (options.status) {
      where.status = options.status as InvoiceStatus;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true, serviceType: true, planName: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInvoiceById(userId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: true,
        user: { select: { name: true, email: true, phone: true, companyName: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.userId !== userId) {
      throw new ForbiddenException('You do not have access to this invoice');
    }

    return invoice;
  }

  async generateInvoicePdf(userId: string, invoiceId: string): Promise<InvoicePdfData> {
    const invoice = await this.getInvoiceById(userId, invoiceId);
    return this.invoiceService.generatePdf(invoice.id);
  }

  // ─── Wallet ────────────────────────────────────────────────────────────────────

  async getWalletBalance(userId: string) {
    const reseller = await this.prisma.reseller.findUnique({
      where: { userId },
      select: { walletBalanceNpr: true },
    });

    return {
      balance: reseller?.walletBalanceNpr || 0,
      currency: 'NPR',
    };
  }

  async topupWallet(userId: string, amount: number, gateway: PaymentGateway) {
    // Create a wallet top-up order
    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        userId,
        orderNumber,
        serviceType: 'ADDON',
        planName: 'wallet-topup',
        durationMonths: 0,
        amountNpr: amount,
        vatAmountNpr: 0,
        totalAmountNpr: amount,
        discountAmountNpr: 0,
        status: 'PENDING',
        notes: JSON.stringify({ type: 'wallet-topup' }),
      },
    });

    // Initiate payment
    const paymentResult = await this.initiatePayment(
      userId,
      order.id,
      gateway,
    );

    return {
      orderId: order.id,
      orderNumber,
      ...paymentResult,
    };
  }

  async creditWallet(userId: string, amount: number, reason: string) {
    // Ensure the reseller record exists
    let reseller = await this.prisma.reseller.findUnique({
      where: { userId },
    });

    if (!reseller) {
      // For non-reseller users, we cannot credit directly to wallet
      // as the schema only has walletBalanceNpr on Reseller
      throw new BadRequestException(
        'Wallet is only available for reseller accounts',
      );
    }

    await this.prisma.reseller.update({
      where: { userId },
      data: { walletBalanceNpr: { increment: amount } },
    });

    this.eventEmitter.emit(BILLING_EVENTS.WALLET_TOPUP, {
      userId,
      amount,
      reason,
    });

    this.logger.log(`Wallet credited ${amount} NPR for user ${userId}: ${reason}`);
  }

  // ─── Promo Codes ───────────────────────────────────────────────────────────────

  async validatePromoCode(
    code: string,
    serviceType: ServiceType,
    amount: number,
  ): Promise<PromoValidationResult> {
    const upperCode = code.toUpperCase();
    const now = new Date();

    const promo = await this.prisma.promoCode.findUnique({
      where: { code: upperCode },
    });

    if (!promo) {
      return { valid: false, message: 'Promo code not found' };
    }

    if (promo.status !== 'ACTIVE') {
      return { valid: false, message: 'Promo code is not active' };
    }

    if (now < promo.validFrom) {
      return { valid: false, message: 'Promo code is not yet valid' };
    }

    if (now > promo.validUntil) {
      return { valid: false, message: 'Promo code has expired' };
    }

    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return { valid: false, message: 'Promo code usage limit reached' };
    }

    if (promo.minOrderAmount && amount < promo.minOrderAmount) {
      return {
        valid: false,
        message: `Minimum order amount is ${promo.minOrderAmount} NPR`,
      };
    }

    // Check applicable services
    const applicableServices = promo.applicableServices as string[] | null;
    if (applicableServices && applicableServices.length > 0) {
      if (!applicableServices.includes(serviceType)) {
        return {
          valid: false,
          message: `Promo code is not valid for ${serviceType}`,
        };
      }
    }

    // Calculate discount
    let discountAmount: number;

    if (promo.discountType === 'PERCENTAGE') {
      discountAmount = Math.round((amount * promo.discountValue) / 100 * 100) / 100;
    } else {
      // FIXED_AMOUNT
      discountAmount = Math.min(promo.discountValue, amount);
    }

    return {
      valid: true,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discountAmount,
      message: `Discount of ${promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : `NPR ${promo.discountValue}`} applied`,
    };
  }

  async applyPromoCode(orderId: string, code: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Promo code can only be applied to pending orders');
    }

    if (order.promoCode) {
      throw new ConflictException('Order already has a promo code applied');
    }

    const result = await this.validatePromoCode(
      code,
      order.serviceType,
      order.amountNpr,
    );

    if (!result.valid) {
      throw new BadRequestException(result.message);
    }

    const discountAmount = result.discountAmount || 0;
    const taxableAmount = Math.max(order.amountNpr - discountAmount, 0);
    const vatAmount = Math.round(taxableAmount * VAT_RATE * 100) / 100;
    const totalAmount = Math.round((taxableAmount + vatAmount) * 100) / 100;

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          promoCode: code.toUpperCase(),
          discountAmountNpr: discountAmount,
          vatAmountNpr: vatAmount,
          totalAmountNpr: totalAmount,
        },
      });

      await tx.promoCode.updateMany({
        where: { code: code.toUpperCase() },
        data: { usedCount: { increment: 1 } },
      });

      // Update the related invoice
      await tx.invoice.updateMany({
        where: { orderId, status: { in: ['DRAFT', 'SENT'] } },
        data: {
          subtotalNpr: order.amountNpr,
          vatAmountNpr: vatAmount,
          totalNpr: totalAmount,
        },
      });
    });

    this.logger.log(
      `Promo code ${code} applied to order ${order.orderNumber}. Discount: ${discountAmount}`,
    );

    return {
      discountAmount,
      vatAmount,
      totalAmount,
      message: result.message,
    };
  }

  // ─── Payment & Transaction History ─────────────────────────────────────────────

  async getPaymentHistory(userId: string, options: PaginationOptions) {
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: { orderNumber: true, serviceType: true, planName: true },
          },
        },
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);

    return {
      data: payments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTransactionHistory(userId: string, options: PaginationOptions) {
    // Transaction history combines payments and wallet changes
    const page = options.page || 1;
    const limit = Math.min(options.limit || 20, 100);
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId, status: 'COMPLETED' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true,
              serviceType: true,
              planName: true,
              notes: true,
            },
          },
        },
      }),
      this.prisma.payment.count({
        where: { userId, status: 'COMPLETED' },
      }),
    ]);

    const transactions = payments.map((p) => {
      let type = 'PAYMENT';
      const orderNotes = p.order.notes;
      if (orderNotes) {
        try {
          const parsed = JSON.parse(orderNotes) as { type?: string };
          if (parsed.type === 'wallet-topup') type = 'WALLET_TOPUP';
          if (parsed.type === 'renewal') type = 'RENEWAL';
          if (parsed.type === 'upgrade') type = 'UPGRADE';
        } catch {
          // Notes not JSON, ignore
        }
      }

      return {
        id: p.id,
        type,
        gateway: p.gateway,
        amount: p.amountNpr,
        orderNumber: p.order.orderNumber,
        serviceType: p.order.serviceType,
        planName: p.order.planName,
        date: p.verifiedAt || p.createdAt,
      };
    });

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────────

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${ORDER_NUMBER_PREFIX}-${year}-`;

    const lastOrder = await this.prisma.order.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastOrder) {
      const lastNumberStr = lastOrder.orderNumber.replace(prefix, '');
      const lastNumber = parseInt(lastNumberStr, 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }
}
