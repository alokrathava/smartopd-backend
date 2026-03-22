import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdmissionType } from '../entities/admission.entity';

export class CreateAdmissionDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() visitId?: string;
  @ApiProperty() @IsUUID() admittingDoctorId: string;
  @ApiProperty({ enum: AdmissionType }) @IsEnum(AdmissionType) admissionType: AdmissionType;
  @ApiProperty() @IsString() admissionReason: string;
  @ApiPropertyOptional() @IsOptional() @IsString() primaryDiagnosis?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() specialInstructions?: string;
}
