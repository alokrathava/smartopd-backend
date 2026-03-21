import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VisitStatus } from '../entities/visit.entity';

export class UpdateVisitStatusDto {
  @ApiProperty({ enum: VisitStatus })
  @IsEnum(VisitStatus)
  status: VisitStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
