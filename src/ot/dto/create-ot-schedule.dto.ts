import {
  IsString,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOtScheduleDto {
  @ApiProperty() @IsUUID() roomId: string;
  @ApiProperty() @IsUUID() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() admissionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() visitId?: string;
  @ApiProperty() @IsUUID() surgeonId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() assistantSurgeonId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() anaesthesiologistId?: string;
  @ApiProperty() @IsString() procedureName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() procedureCode?: string;
  @ApiProperty() @IsDateString() scheduledAt: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(720)
  estimatedDurationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() anaesthesiaType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() preOpInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
