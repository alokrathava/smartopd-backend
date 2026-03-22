import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDischargeSummaryDto {
  @ApiProperty() @IsUUID() admissionId: string;
  @ApiProperty() @IsUUID() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() finalDiagnosis?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() hospitalCourse?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() proceduresPerformed?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medicationsOnDischarge?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dischargeInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() followUpDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() followUpDoctor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() followUpNotes?: string;
}
