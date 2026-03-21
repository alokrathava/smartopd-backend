import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class DispenseDto {
  @ApiProperty()
  @IsUUID()
  prescriptionId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  prescriptionItemId?: string;

  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsString()
  drugName: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  quantityDispensed: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  otpVerified?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
