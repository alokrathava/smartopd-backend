/**
 * Payment Provider Interface
 * Defines contract for all payment providers
 */

import { PaymentMethod, PaymentStatus } from '../enums/payment-method.enum';

export interface PaymentInitRequest {
  billId: string;
  amount: number;
  currency: string;
  description?: string;
  customerEmail?: string;
  customerPhone?: string;
  metadata?: Record<string, any>;
}

export interface PaymentInitResponse {
  paymentId: string;
  orderId: string;
  provider: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  checkoutUrl?: string; // For online payments
  metadata?: Record<string, any>;
}

export interface PaymentVerifyRequest {
  paymentId: string;
  transactionRef: string;
  amount: number;
  metadata?: Record<string, any>;
}

export interface PaymentVerifyResponse {
  success: boolean;
  status: PaymentStatus;
  transactionId: string;
  transactionRef: string;
  amount: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PaymentRefundRequest {
  transactionId: string;
  amount?: number; // Partial refund if less than original
  reason?: string;
}

export interface PaymentRefundResponse {
  refundId: string;
  originalTransactionId: string;
  amount: number;
  status: PaymentStatus;
  timestamp: Date;
}

export interface IPaymentProvider {
  /**
   * Provider name
   */
  getProvider(): PaymentMethod;

  /**
   * Initialize a payment transaction
   */
  initiate(request: PaymentInitRequest): Promise<PaymentInitResponse>;

  /**
   * Verify/capture a payment transaction
   */
  verify(request: PaymentVerifyRequest): Promise<PaymentVerifyResponse>;

  /**
   * Refund a payment transaction
   */
  refund(request: PaymentRefundRequest): Promise<PaymentRefundResponse>;

  /**
   * Get transaction status
   */
  getStatus(transactionId: string): Promise<PaymentStatus>;

  /**
   * Check provider health/availability
   */
  isAvailable(): Promise<boolean>;
}
