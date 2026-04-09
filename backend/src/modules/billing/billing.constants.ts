export const VAT_RATE = 0.13;
export const CURRENCY = 'NPR';
export const ORDER_NUMBER_PREFIX = 'HN';
export const INVOICE_NUMBER_PREFIX = 'INV';
export const PAYMENT_EXPIRY_MINUTES = 60;
export const DUNNING_SCHEDULE = [0, 3, 5, 7]; // days after due date
export const GRACE_PERIOD_DAYS = 7;
export const DATA_RETENTION_DAYS = 30;

export const KHALTI_PAISA_MULTIPLIER = 100;
export const MIN_WALLET_TOPUP_NPR = 100;
export const MAX_WALLET_TOPUP_NPR = 100000;

export const BILLING_QUEUES = {
  PAYMENT: 'billing-payment',
  INVOICE: 'billing-invoice',
  DUNNING: 'billing-dunning',
} as const;

export const BILLING_JOBS = {
  PAYMENT_RETRY: 'payment-retry',
  INVOICE_GENERATION: 'invoice-generation',
  DUNNING_EMAIL: 'dunning-email',
  PAYMENT_EXPIRY_CHECK: 'payment-expiry-check',
} as const;

export const BILLING_EVENTS = {
  ORDER_PAID: 'order.paid',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_FAILED: 'order.failed',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  INVOICE_GENERATED: 'invoice.generated',
  WALLET_TOPUP: 'wallet.topup',
} as const;
