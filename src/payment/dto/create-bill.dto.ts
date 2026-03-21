import { IsUUID, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBillDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  visitId?: string;

  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  consultationFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  medicineAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  miscAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
