import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftType } from '../entities/staff-roster.entity';

export class CreateRosterDto {
  @ApiProperty() @IsUUID() staffId: string;
  @ApiProperty() @IsString() staffRole: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() wardId?: string;
  @ApiProperty({ enum: ShiftType }) @IsEnum(ShiftType) shiftType: ShiftType;
  @ApiProperty({ example: '2025-04-01' }) @IsDateString() shiftDate: string;
  @ApiProperty({ example: '2025-04-01T08:00:00.000Z' })
  @IsDateString()
  startAt: string;
  @ApiProperty({ example: '2025-04-01T16:00:00.000Z' })
  @IsDateString()
  endAt: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
