import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { LabService } from './lab.service';
import { LabController } from './lab.controller';
import { LabOrder } from './entities/lab-order.entity';
import { LabResult } from './entities/lab-result.entity';
import { Patient } from '../patients/entities/patient.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LabOrder, LabResult, Patient]),
    HttpModule,
    NotificationModule,
  ],
  controllers: [LabController],
  providers: [LabService],
  exports: [LabService],
})
export class LabModule {}
