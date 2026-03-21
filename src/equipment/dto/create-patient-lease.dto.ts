import { IsUUID, IsOptional, IsNumber, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePatientLeaseDto {
  @ApiProperty()
  @IsUUID()
  equipmentId: string;

  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  visitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  depositAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  depositMode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
