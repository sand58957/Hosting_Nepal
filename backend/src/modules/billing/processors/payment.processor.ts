import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../database/prisma.service';
import {
  BILLING_QUEUES,
  BILLING_JOBS,
  BILLING_EVENTS,
  DUNNING_SCHEDULE,
  PAYMENT_EXPIRY_MINUTES,
} from '../billing.constants';

interface PaymentRetryPayload {
  orderId: string;
  userId: string;
  attempt: number;
}

interface InvoiceGenerationPayload {
  orderId: string;
  userId: string;
}

interface DunningEmailPayload {
  orderId: string;
  userId: string;
  invoiceId: string;
  dunningStep: number;
}

interface PaymentExpiryPayload {
  paymentId: string;
}

@Processor(BILLING_QUEUES.PAYMENT)
export class PaymentProcessor {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Process(BILLING_JOBS.PAYMENT_RETRY)
  async processPaymentRetry(job: Job<PaymentRetryPayload>) {
    const { orderId, userId, attempt } = job.data;

    this.logger.log(
      `Processing payment retry for order ${orderId}, attempt ${attempt}`,
    );

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { invoices: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });

      if (!order) {
        this.logger.warn(`Order ${orderId} not found for payment retry`);
        return;
      }

      // Skip if order is already paid or cancelled
      if (['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
        this.logger.log(
          `Order ${orderId} is ${order.status}, skipping payment retry`,
        );
        return;
      }

      // Check if we've exceeded dunning schedule
      if (attempt >= DUNNING_SCHEDULE.length) {
        this.logger.log(
          `All dunning attempts exhausted for order ${orderId}. Marking as FAILED.`,
        );

        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'FAILED' },
          });

          if (order.invoices[0]) {
            await tx.invoice.update({
              where: { id: order.invoices[0].id },
              data: { status: 'CANCELLED' },
            });
          }
        });

        this.eventEmitter.emit(BILLING_EVENTS.ORDER_FAILED, {
          orderId,
          orderNumber: order.orderNumber,
          userId,
          reason: 'Dunning attempts exhausted',
        });

        return;
      }

      // Schedule dunning email
      if (order.invoices[0]) {
        await (job.queue as Queue).add(
          BILLING_JOBS.DUNNING_EMAIL,
          {
            orderId,
            userId,
            invoiceId: order.invoices[0].id,
            dunningStep: attempt,
          },
        );
      }

      // Schedule next retry if there are more attempts
      const nextAttempt = attempt + 1;
      if (nextAttempt < DUNNING_SCHEDULE.length) {
        const nextDelay =
          (DUNNING_SCHEDULE[nextAttempt] - DUNNING_SCHEDULE[attempt]) *
          24 *
          60 *
          60 *
          1000;

        await job.queue.add(
          BILLING_JOBS.PAYMENT_RETRY,
          {
            orderId,
            userId,
            attempt: nextAttempt,
          } as PaymentRetryPayload,
          { delay: nextDelay },
        );
      }

      this.logger.log(
        `Dunning step ${attempt} processed for order ${orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `Payment retry failed for order ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error; // Let Bull handle retry
    }
  }

  @Process(BILLING_JOBS.INVOICE_GENERATION)
  async processInvoiceGeneration(job: Job<InvoiceGenerationPayload>) {
    const { orderId, userId } = job.data;

    this.logger.log(`Generating invoice for order ${orderId}`);

    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        this.logger.warn(`Order ${orderId} not found for invoice generation`);
        return;
      }

      // Check if invoice already exists
      const existingInvoice = await this.prisma.invoice.findFirst({
        where: { orderId },
      });

      if (existingInvoice) {
        this.logger.log(
          `Invoice already exists for order ${orderId}: ${existingInvoice.invoiceNumber}`,
        );
        return;
      }

      this.eventEmitter.emit(BILLING_EVENTS.INVOICE_GENERATED, {
        orderId,
        userId,
      });

      this.logger.log(`Invoice generated for order ${orderId}`);
    } catch (error) {
      this.logger.error(
        `Invoice generation failed for order ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  @Process(BILLING_JOBS.DUNNING_EMAIL)
  async processDunningEmail(job: Job<DunningEmailPayload>) {
    const { orderId, userId, invoiceId, dunningStep } = job.data;

    this.logger.log(
      `Sending dunning email for order ${orderId}, step ${dunningStep}`,
    );

    try {
      const [order, invoice, user] = await Promise.all([
        this.prisma.order.findUnique({ where: { id: orderId } }),
        this.prisma.invoice.findUnique({ where: { id: invoiceId } }),
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        }),
      ]);

      if (!order || !invoice || !user) {
        this.logger.warn(
          `Missing data for dunning email: order=${!!order}, invoice=${!!invoice}, user=${!!user}`,
        );
        return;
      }

      // Skip if already paid
      if (order.status === 'COMPLETED' || invoice.status === 'PAID') {
        this.logger.log(
          `Order ${orderId} already paid, skipping dunning email`,
        );
        return;
      }

      // Mark invoice as overdue
      if (invoice.status !== 'OVERDUE' && invoice.status !== 'CANCELLED') {
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: 'OVERDUE' },
        });
      }

      // Emit notification event for the notification module to handle
      const dunningMessages = [
        `Your payment for order ${order.orderNumber} is due. Please complete payment to avoid service interruption.`,
        `Reminder: Your invoice ${invoice.invoiceNumber} for ${order.totalAmountNpr} NPR is overdue. Please pay promptly.`,
        `Urgent: Your payment for order ${order.orderNumber} is ${DUNNING_SCHEDULE[dunningStep]} days overdue. Service may be suspended.`,
        `Final notice: Your payment for order ${order.orderNumber} is critically overdue. Service will be suspended if not paid within 24 hours.`,
      ];

      // Create in-app notification
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'EMAIL',
          category: 'BILLING',
          title: `Payment reminder for ${order.orderNumber}`,
          message: dunningMessages[dunningStep] || dunningMessages[0],
        },
      });

      this.logger.log(
        `Dunning email sent for order ${orderId}, step ${dunningStep}`,
      );
    } catch (error) {
      this.logger.error(
        `Dunning email failed for order ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  @Process(BILLING_JOBS.PAYMENT_EXPIRY_CHECK)
  async processPaymentExpiryCheck(job: Job<PaymentExpiryPayload>) {
    const { paymentId } = job.data;

    this.logger.log(`Checking payment expiry for payment ${paymentId}`);

    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        this.logger.warn(`Payment ${paymentId} not found for expiry check`);
        return;
      }

      // Only expire if still pending
      if (payment.status !== 'PENDING') {
        this.logger.log(
          `Payment ${paymentId} is ${payment.status}, skipping expiry`,
        );
        return;
      }

      // Check if payment is old enough to expire
      const expiryTime = new Date(
        payment.createdAt.getTime() + PAYMENT_EXPIRY_MINUTES * 60 * 1000,
      );

      if (new Date() >= expiryTime) {
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'EXPIRED' },
        });

        this.logger.log(`Payment ${paymentId} expired`);
      }
    } catch (error) {
      this.logger.error(
        `Payment expiry check failed for ${paymentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }
}
