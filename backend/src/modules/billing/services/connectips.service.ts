import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import axios, { AxiosError } from 'axios';
import {
  PaymentGatewayInterface,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyParams,
  PaymentVerifyResult,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class ConnectIpsService implements PaymentGatewayInterface {
  private readonly logger = new Logger(ConnectIpsService.name);
  private readonly baseUrl: string;
  private readonly merchantId: string;
  private readonly appId: string;
  private readonly appName: string;
  private readonly creditorPath: string;
  private readonly pfxPassword: string;
  private readonly verifyUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'CONNECTIPS_BASE_URL',
      'https://login.connectips.com',
    );
    this.merchantId = this.configService.get<string>('CONNECTIPS_MERCHANT_ID', '');
    this.appId = this.configService.get<string>('CONNECTIPS_APP_ID', '');
    this.appName = this.configService.get<string>('CONNECTIPS_APP_NAME', 'HostingNepal');
    this.creditorPath = this.configService.get<string>('CONNECTIPS_PFX_PATH', '');
    this.pfxPassword = this.configService.get<string>('CONNECTIPS_PFX_PASSWORD', '');
    this.verifyUrl = this.configService.get<string>(
      'CONNECTIPS_VERIFY_URL',
      'https://login.connectips.com/connectipswebgw/api/creditor/validatetxn',
    );
  }

  private generateToken(dataToSign: string): string {
    try {
      // Read PEM private key file (converted from PFX)
      // For PFX: convert using openssl pkcs12 -in cert.pfx -nocerts -nodes -out key.pem
      const keyBuffer = fs.readFileSync(this.creditorPath);

      const sign = crypto.createSign('SHA256');
      sign.update(dataToSign);
      sign.end();

      const signature = sign.sign(
        { key: keyBuffer, passphrase: this.pfxPassword },
        'base64',
      );
      return signature;
    } catch (error) {
      this.logger.error(
        `Failed to generate ConnectIPS token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new Error('ConnectIPS token generation failed');
    }
  }

  async initiatePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    try {
      this.logger.log(
        `Initiating ConnectIPS payment for order ${params.orderNumber}, amount: ${params.amount} NPR`,
      );

      const txnDate = new Date()
        .toLocaleDateString('en-US', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
        .replace(/\//g, '-');

      const txnId = params.orderNumber;
      const txnAmount = (params.amount * 100).toString(); // ConnectIPS uses paisa
      const txnCurrency = 'NPR';
      const referenceId = params.orderId;
      const remarks = `Payment for order ${params.orderNumber}`;
      const particulars = `Order ${params.orderNumber}`;

      // Data to sign: MERCHANTID,APPID,APPNAME,TXNID,TXNDATE,TXNCRNCY,TXNAMT,REFERENCEID,REMARKS,PARTICULARS,TOKEN
      const dataToSign = `${this.merchantId},${this.appId},${this.appName},${txnId},${txnDate},${txnCurrency},${txnAmount},${referenceId},${remarks},${particulars}`;

      const token = this.generateToken(dataToSign);

      const formData: Record<string, string> = {
        MERCHANTID: this.merchantId,
        APPID: this.appId,
        APPNAME: this.appName,
        TXNID: txnId,
        TXNDATE: txnDate,
        TXNCRNCY: txnCurrency,
        TXNAMT: txnAmount,
        REFERENCEID: referenceId,
        REMARKS: remarks,
        PARTICULARS: particulars,
        TOKEN: token,
      };

      const paymentUrl = `${this.baseUrl}/connectipswebgw/loginpage`;

      this.logger.log(
        `ConnectIPS payment form generated for order ${params.orderNumber}`,
      );

      return {
        success: true,
        paymentUrl,
        gatewayTransactionId: txnId,
        gatewayReference: referenceId,
        formData,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'ConnectIPS payment initiation failed';

      this.logger.error(
        `ConnectIPS initiation failed for order ${params.orderNumber}: ${errorMessage}`,
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    const transactionId = params.gatewayTransactionId;

    if (!transactionId) {
      return {
        success: false,
        status: 'FAILED',
        error: 'Missing transaction ID for ConnectIPS verification',
      };
    }

    try {
      this.logger.log(`Verifying ConnectIPS payment. TxnId: ${transactionId}`);

      const verifyData = {
        merchantId: this.merchantId,
        appId: this.appId,
        referenceId: params.gatewayReference || '',
        txnId: transactionId,
      };

      const dataToSign = `${verifyData.merchantId},${verifyData.appId},${verifyData.referenceId},${verifyData.txnId}`;
      const token = this.generateToken(dataToSign);

      const response = await axios.post(
        this.verifyUrl,
        { ...verifyData, token },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        },
      );

      const data = response.data as {
        status: string;
        statusMessage: string;
        transactionId: string;
        referenceId: string;
        amount: number;
      };

      this.logger.log(
        `ConnectIPS verification result for TxnId ${transactionId}: status=${data.status}`,
      );

      const isSuccess = data.status === 'SUCCESS' || data.status === '00';

      return {
        success: isSuccess,
        status: isSuccess ? 'COMPLETED' : 'FAILED',
        transactionId: data.transactionId || transactionId,
        amount: data.amount ? data.amount / 100 : undefined,
        refId: data.referenceId,
        rawResponse: data as unknown as Record<string, unknown>,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage =
        axiosError.message || 'ConnectIPS verification failed';

      this.logger.error(
        `ConnectIPS verification failed for TxnId ${transactionId}: ${errorMessage}`,
      );

      return {
        success: false,
        status: 'FAILED',
        error: errorMessage,
      };
    }
  }
}
