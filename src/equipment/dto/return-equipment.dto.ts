import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EquipmentCondition } from '../entities/equipment-lease.entity';

export class ReturnEquipmentDto {
  @ApiProperty({ enum: EquipmentCondition })
  @IsEnum(EquipmentCondition)
  returnedCondition: EquipmentCondition;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
