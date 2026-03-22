import { IsString, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBedDto {
  @ApiProperty() @IsUUID() roomId: string;
  @ApiProperty({ example: 'B-101' }) @IsString() bedNumber: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasVentilator?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasMonitor?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasCallBell?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() hasIvRack?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
