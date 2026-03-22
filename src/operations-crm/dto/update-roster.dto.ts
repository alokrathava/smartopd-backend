import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ShiftStatus } from '../entities/staff-roster.entity';

export class UpdateRosterDto {
  @ApiPropertyOptional({ enum: ShiftStatus })
  @IsOptional()
  @IsEnum(ShiftStatus)
  status?: ShiftStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  swappedWithStaffId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  approvedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
