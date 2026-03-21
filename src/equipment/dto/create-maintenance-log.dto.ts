import { IsUUID, IsEnum, IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MaintenanceType } from '../entities/maintenance-log.entity';

export class CreateMaintenanceLogDto {
  @ApiProperty()
  @IsUUID()
  equipmentId: string;

  @ApiProperty({ enum: MaintenanceType })
  @IsEnum(MaintenanceType)
  maintenanceType: MaintenanceType;

  @ApiProperty()
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  performedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextDueDate?: string;
}
