/**
 * Razorpay Payment Provider
 * Supports payment processing for India
 */

import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import { IPaymentProvider, PaymentInitRequest, PaymentInitResponse, PaymentVerifyRequest, PaymentVerifyResponse, PaymentRefundRequest, PaymentRefundResponse } from './payment-provider.interface';
import { PaymentMethod, PaymentStatus } from '../enums/payment-method.enum';

@Injectable()
export class RazorpayProvider implements IPaymentProvider {
  private razorpay: Razorpay;
  private isInitialized = false;

  constructor(private configService: ConfigService) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (keyId && keySecret) {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      this.isInitialized = true;
    }
  }

  getProvider(): PaymentMethod {
    return PaymentMethod.RAZORPAY;
  }

  async initiate(request: PaymentInitRequest): Promise<PaymentInitResponse> {
    if (!this.isInitialized) {
      throw new BadRequestException('Razorpay is not configured');
    }

    try {
      const options = {
        amount: Math.round(request.amount * 100), // Razorpay expects amount in paise
        currency: request.currency || 'INR',
        receipt: request.billId,
        description: request.description || `Bill ${request.billId}`,
        customer_notify: 1,
        ...(request.customerEmail && { customer_email: request.customerEmail }),
        ...(request.customerPhone && { customer_phone: request.customerPhone }),
        notes: request.metadata || {},
      };

      const order = await this.razorpay.orders.create(options as any);

      return {
        paymentId: order.id,
        orderId: order.id,
        provider: PaymentMethod.RAZORPAY,
        status: PaymentStatus.INITIATED,
        amount: request.amount,
        currency: request.currency || 'INR',
        checkoutUrl: `https://checkout.razorpay.com/?key=${this.configService.get('RAZORPAY_KEY_ID')}&order_id=${order.id}`,
        metadata: {
          razorpay_order_id: order.id,
          created_at: order.created_at,
        },
      };
    } catch (error: any) {
      throw new InternalServerErrorException(`Razorpay initiation failed: ${error.message}`);
    }
  }

  async verify(request: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    if (!this.isInitialized) {
      throw new BadRequestException('Razorpay is not configured');
    }

    try {
      // Razorpay sends payment_id, order_id, and signature in webhook
      // Verify the signature to ensure authenticity
      const crypto = require('crypto');
      const signature = request.metadata?.razorpay_signature;

      if (!signature) {
        throw new BadRequestException('Razorpay signature missing');
      }

      const hmac = crypto.createHmac('sha256', this.configService.get('RAZORPAY_KEY_SECRET'));
      hmac.update(request.metadata?.razorpay_order_id + '|' + request.metadata?.razorpay_payment_id);
      const generated_signature = hmac.digest('hex');

      if (generated_signature !== signature) {
        return {
          success: false,
          status: PaymentStatus.FAILED,
          transactionId: request.metadata?.razorpay_payment_id,
          transactionRef: request.transactionRef,
          amount: request.amount,
          timestamp: new Date(),
        };
      }

      // Capture the payment
      await this.razorpay.payments.capture(request.metadata?.razorpay_payment_id, Math.round(request.amount * 100), 'INR');

      return {
        success: true,
        status: PaymentStatus.SUCCESS,
        transactionId: request.metadata?.razorpay_payment_id,
        transactionRef: request.transactionRef,
        amount: request.amount,
        timestamp: new Date(),
      };
    } catch (error: any) {
      throw new InternalServerErrorException(`Razorpay verification failed: ${error.message}`);
    }
  }

  async refund(request: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    if (!this.isInitialized) {
      throw new BadRequestException('Razorpay is not configured');
    }

    try {
      const options: any = {
        notes: {
          reason: request.reason || 'Refund requested',
        },
      };

      if (request.amount) {
        options.amount = Math.round(request.amount * 100);
      }

      const refund = await this.razorpay.payments.refund(request.transactionId, options);

      return {
        refundId: refund.id,
        originalTransactionId: request.transactionId,
        amount: refund.amount ? refund.amount / 100 : request.amount || 0,
        status: PaymentStatus.REFUNDED,
        timestamp: new Date(),
      };
    } catch (error: any) {
      throw new InternalServerErrorException(`Razorpay refund failed: ${error.message}`);
    }
  }

  async getStatus(transactionId: string): Promise<PaymentStatus> {
    if (!this.isInitialized) {
      throw new BadRequestException('Razorpay is not configured');
    }

    try {
      const payment = await this.razorpay.payments.fetch(transactionId);

      switch (payment.status) {
        case 'captured':
          return PaymentStatus.SUCCESS;
        case 'failed':
          return PaymentStatus.FAILED;
        case 'refunded':
          return PaymentStatus.REFUNDED;
        default:
          return PaymentStatus.PENDING;
      }
    } catch (error: any) {
      throw new InternalServerErrorException(`Failed to get Razorpay payment status: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.isInitialized;
  }
}
