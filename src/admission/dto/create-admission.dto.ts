import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdmissionType } from '../entities/admission.entity';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class CreateAdmissionDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() visitId?: string;
  @ApiProperty() @IsUUID() admittingDoctorId: string;
  @ApiProperty({ enum: AdmissionType })
  @IsEnum(AdmissionType)
  admissionType: AdmissionType;
  @ApiProperty()
  @Sanitize()
  @IsString()
  admissionReason: string;
  @ApiPropertyOptional()
  @Sanitize()
  @IsOptional()
  @IsString()
  primaryDiagnosis?: string;
  @ApiPropertyOptional()
  @Sanitize()
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}
