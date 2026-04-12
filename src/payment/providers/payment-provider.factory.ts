/**
 * Payment Provider Factory
 * Manages all payment providers and routes requests to appropriate provider
 */

import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PaymentMethod } from '../enums/payment-method.enum';
import { IPaymentProvider } from './payment-provider.interface';
import { RazorpayProvider } from './razorpay.provider';
import { CashChequeProvider } from './cash-cheque.provider';
import { StripeProvider } from './stripe.provider';
import { InsuranceProvider, CustomOverrideProvider } from './insurance-custom.provider';

@Injectable()
export class PaymentProviderFactory {
  private providers: Map<PaymentMethod, IPaymentProvider>;

  constructor(
    private razorpayProvider: RazorpayProvider,
    private cashChequeProvider: CashChequeProvider,
    private stripeProvider: StripeProvider,
    private insuranceProvider: InsuranceProvider,
    private customOverrideProvider: CustomOverrideProvider,
  ) {
    this.providers = new Map();
    this.registerProviders();
  }

  private registerProviders(): void {
    this.providers.set(PaymentMethod.RAZORPAY, this.razorpayProvider);
    this.providers.set(PaymentMethod.CASH, this.cashChequeProvider);
    this.providers.set(PaymentMethod.CHEQUE, this.cashChequeProvider); // Share same provider
    this.providers.set(PaymentMethod.STRIPE, this.stripeProvider);
    this.providers.set(PaymentMethod.INSURANCE, this.insuranceProvider);
    this.providers.set(PaymentMethod.CUSTOM_OVERRIDE, this.customOverrideProvider);
    this.providers.set(PaymentMethod.BANK_TRANSFER, this.cashChequeProvider); // Treat like offline
  }

  /**
   * Get a payment provider by method
   */
  getProvider(method: PaymentMethod): IPaymentProvider {
    const provider = this.providers.get(method);

    if (!provider) {
      throw new BadRequestException(`Unsupported payment method: ${method}`);
    }

    return provider;
  }

  /**
   * Get all available providers for a region
   */
  async getAvailableProviders(region?: 'INDIA' | 'INTERNATIONAL'): Promise<PaymentMethod[]> {
    const available: PaymentMethod[] = [];

    for (const [method, provider] of this.providers) {
      if (await provider.isAvailable()) {
        // Filter by region if specified
        if (region === 'INDIA') {
          if ([PaymentMethod.RAZORPAY, PaymentMethod.CASH, PaymentMethod.CHEQUE, PaymentMethod.INSURANCE].includes(method)) {
            available.push(method);
          }
        } else if (region === 'INTERNATIONAL') {
          if ([PaymentMethod.STRIPE, PaymentMethod.BANK_TRANSFER].includes(method)) {
            available.push(method);
          }
        } else {
          available.push(method);
        }
      }
    }

    return available;
  }

  /**
   * Get recommended provider for region
   */
  getRecommendedProvider(region?: 'INDIA' | 'INTERNATIONAL'): PaymentMethod {
    if (region === 'INDIA') {
      return PaymentMethod.RAZORPAY;
    } else if (region === 'INTERNATIONAL') {
      return PaymentMethod.STRIPE;
    }
    return PaymentMethod.CASH;
  }
}
