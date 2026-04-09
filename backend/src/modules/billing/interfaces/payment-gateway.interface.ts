export interface PaymentInitParams {
  orderId: string;
  orderNumber: string;
  amount: number; // in NPR
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  returnUrl: string;
  websiteUrl?: string;
}

export interface PaymentInitResult {
  success: boolean;
  paymentUrl?: string;
  gatewayTransactionId?: string;
  gatewayReference?: string;
  formData?: Record<string, string>; // for form-based redirects like eSewa
  error?: string;
}

export interface PaymentVerifyParams {
  gatewayTransactionId?: string;
  gatewayReference?: string;
  encodedData?: string; // eSewa base64 response
  rawData?: Record<string, unknown>;
}

export interface PaymentVerifyResult {
  success: boolean;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED' | 'EXPIRED';
  transactionId?: string;
  amount?: number;
  fee?: number;
  refId?: string;
  rawResponse?: Record<string, unknown>;
  error?: string;
}

export interface PaymentGatewayInterface {
  initiatePayment(params: PaymentInitParams): Promise<PaymentInitResult>;
  verifyPayment(params: PaymentVerifyParams): Promise<PaymentVerifyResult>;
}
