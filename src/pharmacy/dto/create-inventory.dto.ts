import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateInventoryDto {
  @ApiProperty()
  @IsString()
  drugName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  genericName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  form?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strength?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNo?: string;

  @ApiProperty()
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  reorderLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  mrp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hsnCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  gstPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storageLocation?: string;
}
