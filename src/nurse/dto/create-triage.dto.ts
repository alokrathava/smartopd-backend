import { IsUUID, IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TriageCategory } from '../entities/triage.entity';

export class CreateTriageDto {
  @ApiProperty()
  @IsUUID()
  visitId: string;

  @ApiProperty({ enum: TriageCategory })
  @IsEnum(TriageCategory)
  triageCategory: TriageCategory;

  @ApiProperty()
  @IsString()
  chiefComplaint: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  triageNotes?: string;
}
