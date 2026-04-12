/**
 * Stripe Payment Provider
 * Supports international payment processing
 */

import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { IPaymentProvider, PaymentInitRequest, PaymentInitResponse, PaymentVerifyRequest, PaymentVerifyResponse, PaymentRefundRequest, PaymentRefundResponse } from './payment-provider.interface';
import { PaymentMethod, PaymentStatus } from '../enums/payment-method.enum';

@Injectable()
export class StripeProvider implements IPaymentProvider {
  private stripe: Stripe;
  private isInitialized = false;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (apiKey) {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2023-10-16',
      });
      this.isInitialized = true;
    }
  }

  getProvider(): PaymentMethod {
    return PaymentMethod.STRIPE;
  }

  async initiate(request: PaymentInitRequest): Promise<PaymentInitResponse> {
    if (!this.isInitialized) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      // Create a payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(request.amount * 100), // Stripe expects amount in cents
        currency: (request.currency || 'USD').toLowerCase(),
        description: request.description || `Bill ${request.billId}`,
        receipt_email: request.customerEmail,
        metadata: {
          bill_id: request.billId,
          ...request.metadata,
        },
      });

      return {
        paymentId: paymentIntent.id,
        orderId: paymentIntent.id,
        provider: PaymentMethod.STRIPE,
        status: PaymentStatus.INITIATED,
        amount: request.amount,
        currency: request.currency || 'USD',
        checkoutUrl: `https://checkout.stripe.com/pay/${paymentIntent.client_secret}`,
        metadata: {
          stripe_intent_id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          created_at: new Date(paymentIntent.created * 1000),
        },
      };
    } catch (error: any) {
      throw new InternalServerErrorException(`Stripe initiation failed: ${error.message}`);
    }
  }

  async verify(request: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    if (!this.isInitialized) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(request.paymentId);

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          status: PaymentStatus.SUCCESS,
          transactionId: paymentIntent.id,
          transactionRef: paymentIntent.latest_charge as string,
          amount: request.amount,
          timestamp: new Date(paymentIntent.created * 1000),
        };
      } else if (paymentIntent.status === 'processing') {
        return {
          success: false,
          status: PaymentStatus.PENDING,
          transactionId: paymentIntent.id,
          transactionRef: request.transactionRef,
          amount: request.amount,
          timestamp: new Date(),
        };
      } else {
        return {
          success: false,
          status: PaymentStatus.FAILED,
          transactionId: paymentIntent.id,
          transactionRef: request.transactionRef,
          amount: request.amount,
          timestamp: new Date(),
        };
      }
    } catch (error: any) {
      throw new InternalServerErrorException(`Stripe verification failed: ${error.message}`);
    }
  }

  async refund(request: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    if (!this.isInitialized) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      const refund = await this.stripe.refunds.create({
        charge: request.transactionId,
        amount: request.amount ? Math.round(request.amount * 100) : undefined,
        reason: request.reason ? 'requested_by_customer' : undefined,
        metadata: {
          reason: request.reason || 'No reason provided',
        },
      });

      return {
        refundId: refund.id,
        originalTransactionId: request.transactionId,
        amount: refund.amount ? refund.amount / 100 : request.amount || 0,
        status: PaymentStatus.REFUNDED,
        timestamp: new Date(refund.created * 1000),
      };
    } catch (error: any) {
      throw new InternalServerErrorException(`Stripe refund failed: ${error.message}`);
    }
  }

  async getStatus(transactionId: string): Promise<PaymentStatus> {
    if (!this.isInitialized) {
      throw new BadRequestException('Stripe is not configured');
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(transactionId);

      switch (paymentIntent.status) {
        case 'succeeded':
          return PaymentStatus.SUCCESS;
        case 'processing':
        case 'requires_payment_method':
        case 'requires_confirmation':
          return PaymentStatus.PENDING;
        case 'requires_action':
          return PaymentStatus.INITIATED;
        case 'canceled':
          return PaymentStatus.FAILED;
        default:
          return PaymentStatus.PENDING;
      }
    } catch (error: any) {
      throw new InternalServerErrorException(`Failed to get Stripe payment status: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.isInitialized;
  }
}
