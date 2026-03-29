import {
  IsUUID, IsEnum, IsString, IsNotEmpty, IsOptional, IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LabPartner, LabOrderStatus } from '../entities/lab-order.entity';
import { ResultStatus } from '../entities/lab-result.entity';

export class CreateLabOrderDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiProperty()
  @IsUUID()
  visitId: string;

  @ApiProperty({ description: 'Test name', example: 'Complete Blood Count' })
  @IsString()
  @IsNotEmpty()
  testName: string;

  @ApiPropertyOptional({ description: 'LOINC code', example: '58410-2' })
  @IsOptional()
  @IsString()
  loincCode?: string;

  @ApiPropertyOptional({ enum: LabPartner, default: LabPartner.IN_HOUSE })
  @IsOptional()
  @IsEnum(LabPartner)
  partner?: LabPartner;

  @ApiPropertyOptional({ enum: ['ROUTINE', 'URGENT', 'STAT'], default: 'ROUTINE' })
  @IsOptional()
  @IsEnum(['ROUTINE', 'URGENT', 'STAT'])
  urgency?: 'ROUTINE' | 'URGENT' | 'STAT';

  @ApiPropertyOptional({ description: 'Clinical notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddLabResultDto {
  @ApiProperty({ description: 'Component name', example: 'Haemoglobin' })
  @IsString()
  @IsNotEmpty()
  componentName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  loincCode?: string;

  @ApiProperty({ description: 'Result value', example: '13.5' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ description: 'Unit', example: 'g/dL' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ description: 'Reference range', example: '13.0–17.0' })
  @IsOptional()
  @IsString()
  referenceRange?: string;

  @ApiPropertyOptional({ enum: ResultStatus })
  @IsOptional()
  @IsEnum(ResultStatus)
  status?: ResultStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  interpretation?: string;
}

export class LabOrderFilterDto {
  @ApiPropertyOptional({ enum: LabOrderStatus })
  @IsOptional()
  @IsEnum(LabOrderStatus)
  status?: LabOrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  visitId?: string;
}
