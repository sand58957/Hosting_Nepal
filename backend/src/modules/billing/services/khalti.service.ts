import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import {
  PaymentGatewayInterface,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyParams,
  PaymentVerifyResult,
} from '../interfaces/payment-gateway.interface';
import { KHALTI_PAISA_MULTIPLIER } from '../billing.constants';

@Injectable()
export class KhaltiService implements PaymentGatewayInterface {
  private readonly logger = new Logger(KhaltiService.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly websiteUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'KHALTI_BASE_URL',
      'https://a.khalti.com/api/v2',
    );
    this.secretKey = this.configService.get<string>('KHALTI_SECRET_KEY', '');
    this.websiteUrl = this.configService.get<string>(
      'APP_URL',
      'https://hostingnepal.com',
    );
  }

  async initiatePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    const amountInPaisa = Math.round(params.amount * KHALTI_PAISA_MULTIPLIER);

    const payload = {
      return_url: params.returnUrl,
      website_url: params.websiteUrl || this.websiteUrl,
      amount: amountInPaisa,
      purchase_order_id: params.orderNumber,
      purchase_order_name: `Order ${params.orderNumber}`,
      customer_info: {
        name: params.customerName || '',
        email: params.customerEmail || '',
        phone: params.customerPhone || '',
      },
    };

    try {
      this.logger.log(
        `Initiating Khalti payment for order ${params.orderNumber}, amount: ${amountInPaisa} paisa`,
      );

      const response = await axios.post(
        `${this.baseUrl}/epayment/initiate/`,
        payload,
        {
          headers: {
            Authorization: `Key ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const data = response.data as {
        pidx: string;
        payment_url: string;
        expires_at: string;
      };

      this.logger.log(
        `Khalti payment initiated successfully. pidx: ${data.pidx}`,
      );

      return {
        success: true,
        paymentUrl: data.payment_url,
        gatewayTransactionId: data.pidx,
        gatewayReference: data.pidx,
      };
    } catch (error) {
      const axiosError = error as AxiosError<{ detail?: string; error_key?: string }>;
      const errorMessage =
        axiosError.response?.data?.detail ||
        axiosError.message ||
        'Khalti payment initiation failed';

      this.logger.error(
        `Khalti payment initiation failed for order ${params.orderNumber}: ${errorMessage}`,
        axiosError.response?.data,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    const pidx = params.gatewayTransactionId || params.gatewayReference;

    if (!pidx) {
      return {
        success: false,
        status: 'FAILED',
        error: 'Missing pidx for Khalti verification',
      };
    }

    try {
      this.logger.log(`Verifying Khalti payment. pidx: ${pidx}`);

      const response = await axios.post(
        `${this.baseUrl}/epayment/lookup/`,
        { pidx },
        {
          headers: {
            Authorization: `Key ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      const data = response.data as {
        pidx: string;
        total_amount: number;
        status: string;
        transaction_id: string;
        fee: number;
        refunded: boolean;
      };

      this.logger.log(
        `Khalti lookup result for pidx ${pidx}: status=${data.status}`,
      );

      const statusMap: Record<string, PaymentVerifyResult['status']> = {
        Completed: 'COMPLETED',
        Pending: 'PENDING',
        Initiated: 'PENDING',
        Refunded: 'REFUNDED',
        'Partially Refunded': 'REFUNDED',
        Expired: 'EXPIRED',
        'User canceled': 'FAILED',
      };

      const mappedStatus = statusMap[data.status] || 'FAILED';

      return {
        success: mappedStatus === 'COMPLETED',
        status: mappedStatus,
        transactionId: data.transaction_id,
        amount: data.total_amount / KHALTI_PAISA_MULTIPLIER,
        fee: data.fee / KHALTI_PAISA_MULTIPLIER,
        refId: data.pidx,
        rawResponse: data as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const axiosError = error as AxiosError<{ detail?: string }>;
      const errorMessage =
        axiosError.response?.data?.detail ||
        axiosError.message ||
        'Khalti verification failed';

      this.logger.error(`Khalti verification failed for pidx ${pidx}: ${errorMessage}`);

      return {
        success: false,
        status: 'FAILED',
        error: errorMessage,
      };
    }
  }
}
