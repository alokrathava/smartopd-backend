import {
  IsUUID,
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FollowUpPriority } from '../entities/follow-up.entity';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class CreateFollowUpDto {
  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  visitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiProperty()
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional()
  @Sanitize()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @Sanitize()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: FollowUpPriority })
  @IsOptional()
  @IsEnum(FollowUpPriority)
  priority?: FollowUpPriority;
}
