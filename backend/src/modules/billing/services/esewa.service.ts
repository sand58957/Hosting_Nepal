import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  PaymentGatewayInterface,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyParams,
  PaymentVerifyResult,
} from '../interfaces/payment-gateway.interface';

interface EsewaDecodedResponse {
  transaction_code: string;
  status: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
  signature: string;
}

@Injectable()
export class EsewaService implements PaymentGatewayInterface {
  private readonly logger = new Logger(EsewaService.name);
  private readonly baseUrl: string;
  private readonly productCode: string;
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'ESEWA_BASE_URL',
      'https://epay.esewa.com.np',
    );
    this.productCode = this.configService.get<string>(
      'ESEWA_PRODUCT_CODE',
      '',
    );
    this.secretKey = this.configService.get<string>('ESEWA_SECRET_KEY', '');
  }

  private generateHmacSignature(message: string): string {
    const hmac = crypto.createHmac('sha256', this.secretKey);
    hmac.update(message);
    return hmac.digest('base64');
  }

  private buildSignedMessage(fields: Record<string, string>, signedFieldNames: string[]): string {
    return signedFieldNames
      .map((field) => `${field}=${fields[field]}`)
      .join(',');
  }

  async initiatePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    try {
      this.logger.log(
        `Initiating eSewa payment for order ${params.orderNumber}, amount: ${params.amount} NPR`,
      );

      const transactionUuid = params.orderNumber;
      const totalAmount = params.amount.toString();
      const taxAmount = '0'; // VAT is already included in our total
      const productServiceCharge = '0';
      const productDeliveryCharge = '0';
      const amount = totalAmount;

      const signedFieldNames = [
        'total_amount',
        'transaction_uuid',
        'product_code',
      ];

      const fields: Record<string, string> = {
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
        product_code: this.productCode,
      };

      const signedMessage = this.buildSignedMessage(fields, signedFieldNames);
      const signature = this.generateHmacSignature(signedMessage);

      const formData: Record<string, string> = {
        amount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
        product_code: this.productCode,
        product_service_charge: productServiceCharge,
        product_delivery_charge: productDeliveryCharge,
        success_url: params.returnUrl,
        failure_url: `${params.returnUrl}?status=failed`,
        signed_field_names: signedFieldNames.join(','),
        signature,
      };

      const paymentUrl = `${this.baseUrl}/api/epay/main/v2/form`;

      this.logger.log(
        `eSewa payment form data generated for order ${params.orderNumber}`,
      );

      return {
        success: true,
        paymentUrl,
        gatewayTransactionId: transactionUuid,
        gatewayReference: transactionUuid,
        formData,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'eSewa payment initiation failed';

      this.logger.error(
        `eSewa payment initiation failed for order ${params.orderNumber}: ${errorMessage}`,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    const encodedData = params.encodedData;

    if (!encodedData) {
      return {
        success: false,
        status: 'FAILED',
        error: 'Missing encoded data for eSewa verification',
      };
    }

    try {
      this.logger.log('Verifying eSewa payment with encoded response data');

      const decodedString = Buffer.from(encodedData, 'base64').toString('utf-8');
      let decoded: EsewaDecodedResponse;

      try {
        decoded = JSON.parse(decodedString) as EsewaDecodedResponse;
      } catch {
        this.logger.error('Failed to parse eSewa decoded response');
        return {
          success: false,
          status: 'FAILED',
          error: 'Invalid eSewa response data format',
        };
      }

      // Verify the HMAC signature
      const signedFieldNames = decoded.signed_field_names.split(',');
      const fields: Record<string, string> = decoded as unknown as Record<string, string>;
      const signedMessage = this.buildSignedMessage(fields, signedFieldNames);
      const expectedSignature = this.generateHmacSignature(signedMessage);

      if (decoded.signature !== expectedSignature) {
        this.logger.error(
          `eSewa signature mismatch for transaction ${decoded.transaction_uuid}`,
        );
        return {
          success: false,
          status: 'FAILED',
          error: 'eSewa signature verification failed',
        };
      }

      this.logger.log(
        `eSewa signature verified for transaction ${decoded.transaction_uuid}, status: ${decoded.status}`,
      );

      const isSuccess =
        decoded.status === 'COMPLETE' || decoded.status === 'COMPLETED';

      return {
        success: isSuccess,
        status: isSuccess ? 'COMPLETED' : 'FAILED',
        transactionId: decoded.transaction_code,
        amount: parseFloat(decoded.total_amount),
        refId: decoded.transaction_uuid,
        rawResponse: decoded as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'eSewa verification failed';

      this.logger.error(`eSewa verification failed: ${errorMessage}`);

      return {
        success: false,
        status: 'FAILED',
        error: errorMessage,
      };
    }
  }
}
