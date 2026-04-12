import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bill } from './entities/bill.entity';
import { BillItem } from './entities/bill-item.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { NhcxClaim } from './entities/nhcx-claim.entity';
import { Patient } from '../patients/entities/patient.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { RazorpayProvider } from './providers/razorpay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { CashChequeProvider } from './providers/cash-cheque.provider';
import {
  InsuranceProvider,
  CustomOverrideProvider,
} from './providers/insurance-custom.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Bill,
      BillItem,
      PaymentTransaction,
      NhcxClaim,
      Patient,
    ]),
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentProviderFactory,
    RazorpayProvider,
    StripeProvider,
    CashChequeProvider,
    InsuranceProvider,
    CustomOverrideProvider,
  ],
  exports: [PaymentService, PaymentProviderFactory],
})
export class PaymentModule {}
