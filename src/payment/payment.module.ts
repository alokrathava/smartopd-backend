import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bill } from './entities/bill.entity';
import { BillItem } from './entities/bill-item.entity';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { NhcxClaim } from './entities/nhcx-claim.entity';
import { Patient } from '../patients/entities/patient.entity';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

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
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
