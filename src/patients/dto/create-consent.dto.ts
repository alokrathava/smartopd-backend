import {
  IsEnum,
  IsOptional,
  IsBoolean,
  IsString,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsentType } from '../entities/patient-consent.entity';

export class CreateConsentDto {
  @ApiProperty({ enum: ConsentType })
  @IsEnum(ConsentType)
  consentType: ConsentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  consentGivenAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isGuardian?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianRelation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentUrl?: string;
}
