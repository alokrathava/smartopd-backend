import { IsUUID, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMarDto {
  @ApiProperty()
  @IsUUID()
  visitId: string;

  @ApiProperty()
  @IsUUID()
  patientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  prescriptionItemId?: string;

  @ApiProperty()
  @IsString()
  drugName: string;

  @ApiProperty()
  @IsString()
  dose: string;

  @ApiProperty()
  @IsString()
  route: string;

  @ApiProperty()
  @IsDateString()
  scheduledAt: string;
}
