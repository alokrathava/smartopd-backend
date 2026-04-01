import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AbdmService } from './abdm.service';
import { AbdmController } from './abdm.controller';
import { AbdmRecord } from './entities/abdm-record.entity';
import { Patient } from '../patients/entities/patient.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AbdmRecord, Patient]), HttpModule],
  controllers: [AbdmController],
  providers: [AbdmService],
  exports: [AbdmService],
})
export class AbdmModule {}
