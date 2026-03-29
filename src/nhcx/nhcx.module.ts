import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { NhcxService } from './nhcx.service';
import { NhcxController } from './nhcx.controller';
import { NhcxClaimRecord } from './entities/nhcx-claim-record.entity';
import { Bill } from '../payment/entities/bill.entity';
import { Patient } from '../patients/entities/patient.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NhcxClaimRecord, Bill, Patient]),
    HttpModule,
  ],
  controllers: [NhcxController],
  providers: [NhcxService],
  exports: [NhcxService],
})
export class NhcxModule {}
