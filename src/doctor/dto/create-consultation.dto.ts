import {
  IsUUID,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConsultationDto {
  @ApiProperty()
  @IsUUID()
  visitId: string;

  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  historyOfPresentIllness?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pastMedicalHistory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  familyHistory?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  physicalExamination?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  investigations?: string;

  @ApiPropertyOptional({
    type: 'array',
    description: 'JSON array of diagnosis objects',
  })
  @IsOptional()
  diagnoses?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  advice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  followUpInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referredToSpecialty?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referralNotes?: string;
}
