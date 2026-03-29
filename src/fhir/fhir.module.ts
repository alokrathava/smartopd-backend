import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { FhirService } from './fhir.service';
import { Visit } from '../visits/entities/visit.entity';
import { Consultation } from '../doctor/entities/consultation.entity';
import { Prescription } from '../doctor/entities/prescription.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Admission } from '../admission/entities/admission.entity';
import { DischargeSummary } from '../admission/entities/discharge-summary.entity';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    TypeOrmModule.forFeature([
      Visit,
      Consultation,
      Prescription,
      Patient,
      Admission,
      DischargeSummary,
    ]),
  ],
  providers: [FhirService],
  exports: [FhirService],
})
export class FhirModule {}
