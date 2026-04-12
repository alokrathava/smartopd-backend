/**
 * Insurance and Custom Override Payment Provider
 * For insurance claims and custom payment methods
 */

import { Injectable } from '@nestjs/common';
import { IPaymentProvider, PaymentInitRequest, PaymentInitResponse, PaymentVerifyRequest, PaymentVerifyResponse, PaymentRefundRequest, PaymentRefundResponse } from './payment-provider.interface';
import { PaymentMethod, PaymentStatus } from '../enums/payment-method.enum';

@Injectable()
export class InsuranceProvider implements IPaymentProvider {
  getProvider(): PaymentMethod {
    return PaymentMethod.INSURANCE;
  }

  async initiate(request: PaymentInitRequest): Promise<PaymentInitResponse> {
    const transactionId = `INS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      paymentId: transactionId,
      orderId: request.billId,
      provider: PaymentMethod.INSURANCE,
      status: PaymentStatus.PENDING,
      amount: request.amount,
      currency: request.currency || 'INR',
      metadata: {
        instruction: 'Insurance claim pending. Awaiting insurer approval.',
        claim_id: request.metadata?.claim_id,
        insurance_provider: request.metadata?.insurance_provider,
        member_id: request.metadata?.member_id,
        generated_at: new Date(),
      },
    };
  }

  async verify(request: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    // Insurance verification typically happens via:
    // 1. Insurer API callback
    // 2. Manual verification by staff
    // 3. Pre-authorization check

    return {
      success: true,
      status: PaymentStatus.SUCCESS,
      transactionId: request.paymentId,
      transactionRef: request.transactionRef,
      amount: request.amount,
      timestamp: new Date(),
      metadata: {
        verified_at: new Date(),
        verification_method: 'insurance_api_or_manual',
      },
    };
  }

  async refund(request: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    const refundId = `INS-REFUND-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      refundId,
      originalTransactionId: request.transactionId,
      amount: request.amount || 0,
      status: PaymentStatus.REFUNDED,
      timestamp: new Date(),
    };
  }

  async getStatus(transactionId: string): Promise<PaymentStatus> {
    return PaymentStatus.PENDING;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}

@Injectable()
export class CustomOverrideProvider implements IPaymentProvider {
  getProvider(): PaymentMethod {
    return PaymentMethod.CUSTOM_OVERRIDE;
  }

  async initiate(request: PaymentInitRequest): Promise<PaymentInitResponse> {
    const transactionId = `CUSTOM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      paymentId: transactionId,
      orderId: request.billId,
      provider: PaymentMethod.CUSTOM_OVERRIDE,
      status: PaymentStatus.PENDING,
      amount: request.amount,
      currency: request.currency || 'INR',
      metadata: {
        instruction: 'Custom payment method. Awaiting manual processing by hospital/clinic staff.',
        custom_method: request.metadata?.custom_method,
        notes: request.metadata?.notes,
        generated_at: new Date(),
      },
    };
  }

  async verify(request: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    // Custom payment verification is manual or via custom webhook
    return {
      success: true,
      status: PaymentStatus.SUCCESS,
      transactionId: request.paymentId,
      transactionRef: request.transactionRef,
      amount: request.amount,
      timestamp: new Date(),
      metadata: {
        verified_at: new Date(),
        verification_method: 'manual_override',
      },
    };
  }

  async refund(request: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    const refundId = `CUSTOM-REFUND-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      refundId,
      originalTransactionId: request.transactionId,
      amount: request.amount || 0,
      status: PaymentStatus.REFUNDED,
      timestamp: new Date(),
    };
  }

  async getStatus(transactionId: string): Promise<PaymentStatus> {
    return PaymentStatus.PENDING;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
