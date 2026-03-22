import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BedStatus } from '../entities/bed.entity';

export class UpdateBedStatusDto {
  @ApiProperty({ enum: BedStatus }) @IsEnum(BedStatus) status: BedStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
