import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisitType } from '../entities/visit.entity';

export class CreateVisitDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional({ description: 'Doctor UUID' })
  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @ApiProperty({ enum: VisitType })
  @IsEnum(VisitType)
  visitType: VisitType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTeleConsult?: boolean;
}
