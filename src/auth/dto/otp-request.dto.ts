import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpPurpose } from '../entities/otp.entity';

export class OtpRequestDto {
  @ApiProperty({ example: '+919876543210' })
  @IsNotEmpty()
  @Matches(/^\+91[0-9]{10}$/, { message: 'Phone must be in +91XXXXXXXXXX format' })
  phone: string;

  @ApiProperty({ enum: OtpPurpose })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;
}

export class OtpVerifyDto {
  @ApiProperty() @IsNotEmpty() @IsString() phone: string;
  @ApiProperty() @IsNotEmpty() @IsString() code: string;
  @ApiProperty({ enum: OtpPurpose }) @IsEnum(OtpPurpose) purpose: OtpPurpose;
  @ApiPropertyOptional() @IsOptional() @IsString() facilityId?: string;
}
