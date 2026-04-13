/**
 * Cash and Cheque Payment Provider
 * Offline payment method for India and other regions
 */

import { Injectable } from '@nestjs/common';
import {
  IPaymentProvider,
  PaymentInitRequest,
  PaymentInitResponse,
  PaymentVerifyRequest,
  PaymentVerifyResponse,
  PaymentRefundRequest,
  PaymentRefundResponse,
} from './payment-provider.interface';
import { PaymentMethod, PaymentStatus } from '../enums/payment-method.enum';

@Injectable()
export class CashChequeProvider implements IPaymentProvider {
  getProvider(): PaymentMethod {
    return PaymentMethod.CASH; // Can be extended for CHEQUE
  }

  async initiate(request: PaymentInitRequest): Promise<PaymentInitResponse> {
    // For cash/cheque, generate a transaction ID
    const transactionId = `CASH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      paymentId: transactionId,
      orderId: request.billId,
      provider: PaymentMethod.CASH,
      status: PaymentStatus.PENDING,
      amount: request.amount,
      currency: request.currency || 'INR',
      metadata: {
        instruction: 'Please collect cash/cheque from patient',
        generated_at: new Date(),
        bill_id: request.billId,
      },
    };
  }

  async verify(request: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    // For cash/cheque, verification happens when staff confirms receipt
    // This is typically done manually in the UI

    return {
      success: true,
      status: PaymentStatus.SUCCESS,
      transactionId: request.paymentId,
      transactionRef: request.transactionRef,
      amount: request.amount,
      timestamp: new Date(),
      metadata: {
        verified_at: new Date(),
        manual_verification: true,
      },
    };
  }

  async refund(request: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    // For cash/cheque, refund means returning cash or cancelling cheque
    const refundId = `REFUND-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      refundId,
      originalTransactionId: request.transactionId,
      amount: request.amount || 0,
      status: PaymentStatus.REFUNDED,
      timestamp: new Date(),
    };
  }

  async getStatus(transactionId: string): Promise<PaymentStatus> {
    // For offline payments, status is typically maintained in DB
    // This is a placeholder
    return PaymentStatus.PENDING;
  }

  async isAvailable(): Promise<boolean> {
    // Cash/cheque is always available
    return true;
  }
}
