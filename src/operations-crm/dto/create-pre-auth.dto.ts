import { IsString, IsOptional, IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePreAuthDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() admissionId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() visitId?: string;
  @ApiProperty() @IsString() insurerName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() policyNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tpaName?: string;
  @ApiPropertyOptional({ description: 'JSON array of ICD-10 codes' }) @IsOptional() @IsString() diagnosisCodes?: string;
  @ApiPropertyOptional({ description: 'JSON array of procedure names/codes' }) @IsOptional() @IsString() requestedProcedures?: string;
  @ApiProperty() @IsNumber() @Min(0) estimatedCost: number;
}
