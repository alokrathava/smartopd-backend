import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PreAuthStatus } from '../entities/insurance-pre-auth.entity';

export class UpdatePreAuthDto {
  @ApiPropertyOptional({ enum: PreAuthStatus }) @IsOptional() @IsEnum(PreAuthStatus) status?: PreAuthStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() referenceNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) approvedAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() rejectionReason?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() insurerResponseJson?: string;
}
