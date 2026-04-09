import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  VAT_RATE,
  INVOICE_NUMBER_PREFIX,
  CURRENCY,
} from '../billing.constants';

export interface InvoicePdfData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  paidAt: string | null;
  status: string;
  customer: {
    name: string;
    email: string;
    phone: string | null;
    companyName: string | null;
  };
  company: {
    name: string;
    address: string;
    panNumber: string;
    phone: string;
    email: string;
    website: string;
  };
  items: Array<{
    description: string;
    serviceType: string;
    planName: string | null;
    durationMonths: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discount: number;
  promoCode: string | null;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  orderNumber: string;
}

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(private readonly prisma: PrismaService) {}

  calculateVAT(subtotal: number): { vatAmount: number; total: number } {
    const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100;
    const total = Math.round((subtotal + vatAmount) * 100) / 100;
    return { vatAmount, total };
  }

  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${INVOICE_NUMBER_PREFIX}-${year}-`;

    const lastInvoice = await this.prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const lastNumberStr = lastInvoice.invoiceNumber.replace(prefix, '');
      const lastNumber = parseInt(lastNumberStr, 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  async generateInvoice(
    orderId: string,
    userId: string,
    subtotal: number,
    discount: number,
  ): Promise<{ id: string; invoiceNumber: string }> {
    const invoiceNumber = await this.generateInvoiceNumber();
    const taxableAmount = Math.max(subtotal - discount, 0);
    const { vatAmount, total } = this.calculateVAT(taxableAmount);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

    const invoice = await this.prisma.invoice.create({
      data: {
        userId,
        orderId,
        invoiceNumber,
        subtotalNpr: subtotal,
        vatRate: VAT_RATE * 100, // Store as percentage (13)
        vatAmountNpr: vatAmount,
        totalNpr: total,
        status: 'DRAFT',
        dueDate,
      },
    });

    this.logger.log(
      `Invoice ${invoiceNumber} generated for order ${orderId}. Subtotal: ${subtotal}, VAT: ${vatAmount}, Total: ${total}`,
    );

    return { id: invoice.id, invoiceNumber: invoice.invoiceNumber };
  }

  async markInvoicePaid(invoiceId: string): Promise<void> {
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    this.logger.log(`Invoice ${invoiceId} marked as PAID`);
  }

  async markInvoiceOverdue(invoiceId: string): Promise<void> {
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'OVERDUE' },
    });
  }

  async generatePdf(invoiceId: string): Promise<InvoicePdfData> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        user: true,
        order: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    const pdfData: InvoicePdfData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.createdAt.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      paidAt: invoice.paidAt?.toISOString() || null,
      status: invoice.status,
      customer: {
        name: invoice.user.name,
        email: invoice.user.email,
        phone: invoice.user.phone,
        companyName: invoice.user.companyName,
      },
      company: {
        name: 'Hosting Nepal Pvt. Ltd.',
        address: 'Kathmandu, Nepal',
        panNumber: '000000000', // Replace with actual PAN
        phone: '+977-1-XXXXXXX',
        email: 'billing@hostingnepal.com',
        website: 'https://hostingnepal.com',
      },
      items: [
        {
          description: `${invoice.order.serviceType} - ${invoice.order.planName || 'Standard'}`,
          serviceType: invoice.order.serviceType,
          planName: invoice.order.planName,
          durationMonths: invoice.order.durationMonths,
          quantity: 1,
          unitPrice: invoice.order.amountNpr,
          totalPrice: invoice.order.amountNpr,
        },
      ],
      subtotal: invoice.subtotalNpr,
      discount: invoice.order.discountAmountNpr,
      promoCode: invoice.order.promoCode,
      vatRate: invoice.vatRate,
      vatAmount: invoice.vatAmountNpr,
      total: invoice.totalNpr,
      currency: CURRENCY,
      orderNumber: invoice.order.orderNumber,
    };

    this.logger.log(`PDF data generated for invoice ${invoice.invoiceNumber}`);

    return pdfData;
  }
}
