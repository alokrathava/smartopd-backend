import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from './entities/patient.entity';
import { PatientConsent } from './entities/patient-consent.entity';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Patient, PatientConsent])],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
