import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsString,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateVitalsDto {
  @ApiProperty()
  @IsUUID()
  visitId: string;

  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  temperatureCelsius?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  temperatureSite?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pulseBpm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  respiratoryRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  systolicBp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  diastolicBp?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  spO2?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  heightCm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  weightKg?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  @Type(() => Number)
  painScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  bloodGlucose?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
