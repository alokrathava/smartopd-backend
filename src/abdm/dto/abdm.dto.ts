import {
  IsString,
  IsNotEmpty,
  IsEnum,
  Length,
  Matches,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateAadhaarOtpDto {
  @ApiProperty({ description: 'Patient ID in SmartOPD', example: 'uuid' })
  @IsUUID()
  patientId: string;

  @ApiProperty({
    description: 'Aadhaar number (12 digits)',
    example: '123456789012',
  })
  @IsString()
  @Length(12, 12)
  @Matches(/^\d{12}$/, { message: 'Aadhaar must be exactly 12 digits' })
  aadhaarNumber: string;
}

export class VerifyAadhaarOtpDto {
  @ApiProperty({ description: 'Patient ID', example: 'uuid' })
  @IsUUID()
  patientId: string;

  @ApiProperty({
    description: 'Transaction ID from generateOtp response',
    example: 'txn-uuid',
  })
  @IsString()
  @IsNotEmpty()
  txnId: string;

  @ApiProperty({
    description: '6-digit OTP sent to Aadhaar-linked mobile',
    example: '123456',
  })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  otp: string;
}

export class InitM2LinkDto {
  @ApiProperty({ description: 'Patient ID', example: 'uuid' })
  @IsUUID()
  patientId: string;

  @ApiProperty({
    description: 'ABHA number to link (14-digit)',
    example: '12-1234-1234-1234',
  })
  @IsString()
  @IsNotEmpty()
  abhaNumber: string;

  @ApiProperty({
    enum: ['AADHAAR_OTP', 'MOBILE_OTP', 'DEMOGRAPHICS'],
    description: 'Auth mode for linking',
  })
  @IsEnum(['AADHAAR_OTP', 'MOBILE_OTP', 'DEMOGRAPHICS'])
  authMode: 'AADHAAR_OTP' | 'MOBILE_OTP' | 'DEMOGRAPHICS';
}

export class ConfirmM2LinkDto {
  @ApiProperty({ description: 'Patient ID', example: 'uuid' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ description: 'Transaction ID from initLink response' })
  @IsString()
  @IsNotEmpty()
  txnId: string;

  @ApiProperty({ description: "OTP from patient's ABHA-linked mobile" })
  @IsString()
  @Length(6, 6)
  otp: string;
}

export class RequestM3ConsentDto {
  @ApiProperty({ description: 'Patient ID', example: 'uuid' })
  @IsUUID()
  patientId: string;

  @ApiProperty({
    description: 'Purpose of data access',
    enum: ['CARE_MANAGEMENT', 'BREAK_THE_GLASS', 'SELF_REQUESTED'],
  })
  @IsEnum(['CARE_MANAGEMENT', 'BREAK_THE_GLASS', 'SELF_REQUESTED'])
  purpose: string;

  @ApiPropertyOptional({
    description: 'Health information types to fetch',
    example: ['DiagnosticReport', 'Prescription', 'OPConsultation'],
  })
  @IsOptional()
  @IsString({ each: true })
  hiTypes?: string[];
}
