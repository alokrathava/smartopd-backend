import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePatientDto } from './create-patient.dto';

export class UpdatePatientDto extends PartialType(OmitType(CreatePatientDto, ['consentGiven'] as const)) {}
