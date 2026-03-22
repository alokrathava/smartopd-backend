import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Visit } from '../visits/entities/visit.entity';
import { Bill } from '../payment/entities/bill.entity';
import { Equipment } from '../equipment/entities/equipment.entity';
import { EquipmentLease } from '../equipment/entities/equipment-lease.entity';
import { Patient } from '../patients/entities/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Visit, Bill, Equipment, EquipmentLease, Patient])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
