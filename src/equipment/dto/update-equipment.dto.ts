import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { EquipmentCategory, OwnershipType } from '../entities/equipment.entity';

export class UpdateEquipmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: EquipmentCategory })
  @IsOptional()
  @IsEnum(EquipmentCategory)
  category?: EquipmentCategory;

  @ApiPropertyOptional({ enum: OwnershipType })
  @IsOptional()
  @IsEnum(OwnershipType)
  ownershipType?: OwnershipType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assetTag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qrCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  purchasePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  warrantyExpiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextMaintenanceDue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  maintenanceFrequencyDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
