import { IsUUID, IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChecklistType } from '../entities/ot-checklist.entity';

export class CreateOtChecklistDto {
  @ApiProperty() @IsUUID() otScheduleId: string;
  @ApiProperty({ enum: ChecklistType })
  @IsEnum(ChecklistType)
  checklistType: ChecklistType;
  @ApiProperty({
    description: 'JSON array of checklist items [{label, checked, notes}]',
  })
  @IsString()
  items: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
