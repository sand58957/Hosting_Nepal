import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { PrismaService } from '../../../database/prisma.service';
import { SendgridService } from '../services/sendgrid.service';

interface OrderPaidEvent {
  orderId: string;
  orderNumber: string;
  userId: string;
  gateway: string;
  amount: number;
  paymentId: string;
}

@Injectable()
export class BillingEmailListener {
  private readonly logger = new Logger(BillingEmailListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: SendgridService,
  ) {}

  // Handles wallet payments AND gateway-verified payments — both emit ORDER_PAID.
  @OnEvent('order.paid', { async: true })
  async onOrderPaid(payload: OrderPaidEvent): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      include: { user: true },
    });

    if (!order || !order.user?.email) {
      this.logger.warn(
        `order.paid received but order or user missing (orderId=${payload.orderId})`,
      );
      return;
    }

    const firstName = order.user.name?.split(' ')[0] || 'Customer';
    const itemLabel =
      order.planName ||
      `${order.serviceType} (${order.durationMonths} months)`;

    // Receipt covers the payment; include order context.
    await this.mailService.sendPaymentReceipt(
      { email: order.user.email, firstName },
      {
        id: payload.paymentId,
        amount: payload.amount,
        method: payload.gateway,
        orderNumber: order.orderNumber,
        paidAt: new Date(),
      },
    );

    // Order confirmation gives them the line-item summary.
    await this.mailService.sendOrderConfirmation(
      { email: order.user.email, firstName },
      {
        id: order.orderNumber,
        total: order.totalAmountNpr,
        items: [{ name: itemLabel, amount: order.totalAmountNpr }],
      },
    );
  }
}
