import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
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

  @ApiProperty()
  @IsString()
  form: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  strength?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  manufacturer?: string;

  @ApiProperty()
  @IsString()
  batchNumber: string;

  @ApiProperty()
  @IsDateString()
  expiryDate: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  quantityInStock: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  reorderLevel?: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  unitPrice: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  mrp: number;

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
