import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpPurpose } from '../entities/otp.entity';

export class OtpRequestDto {
  @ApiProperty({
    example: '+919876543210',
    description: 'Mobile number in +91XXXXXXXXXX format',
  })
  @IsNotEmpty()
  @Matches(/^\+91[0-9]{10}$/, {
    message: 'Phone must be in +91XXXXXXXXXX format',
  })
  phone: string;

  @ApiProperty({
    enum: OtpPurpose,
    description: 'Purpose for which OTP is requested',
  })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;

  @ApiPropertyOptional({
    description: 'Facility ID — required for non-SUPER_ADMIN flows',
  })
  @IsOptional()
  @IsString()
  facilityId?: string;
}

export class OtpVerifyDto {
  @ApiProperty({
    example: '+919876543210',
    description: 'Mobile number in +91XXXXXXXXXX format',
  })
  @IsNotEmpty()
  @Matches(/^\+91[0-9]{10}$/, {
    message: 'Phone must be in +91XXXXXXXXXX format',
  })
  phone: string;

  @ApiProperty({ example: '482910', description: '6-digit OTP code' })
  @IsNotEmpty()
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  code: string;

  @ApiProperty({
    enum: OtpPurpose,
    description: 'Must match the purpose used when requesting OTP',
  })
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  facilityId?: string;
}
