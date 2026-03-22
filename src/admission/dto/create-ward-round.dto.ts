import { IsUUID, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWardRoundDto {
  @ApiProperty() @IsUUID() admissionId: string;
  @ApiProperty() @IsUUID() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() subjectiveNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() objectiveFindings?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assessment?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() planOfCare?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nextRoundAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() criticalAlert?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() alertReason?: string;
}
