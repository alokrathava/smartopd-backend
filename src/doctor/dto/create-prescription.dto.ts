import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePrescriptionDto {
  @ApiProperty()
  @IsUUID()
  visitId: string;

  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  consultationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
