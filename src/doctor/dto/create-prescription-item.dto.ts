import {
  IsUUID,
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DrugForm, Frequency } from '../entities/prescription-item.entity';

export class CreatePrescriptionItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  prescriptionId?: string;

  @ApiProperty()
  @IsString()
  drugName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genericName?: string;

  @ApiProperty({ enum: DrugForm })
  @IsEnum(DrugForm)
  form: DrugForm;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strength?: string;

  @ApiProperty()
  @IsString()
  dose: string;

  @ApiProperty({ enum: Frequency })
  @IsEnum(Frequency)
  frequency: Frequency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  route?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  durationDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isGenericSubstitutable?: boolean;
}
