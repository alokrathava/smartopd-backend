import {
  IsString,
  IsEnum,
  IsDateString,
  IsOptional,
  IsEmail,
  Matches,
  IsBoolean,
  IsNotEmpty,
  Equals,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '../../common/enums/gender.enum';

export class CreatePatientDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: '1990-05-15' })
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ enum: Gender })
  @IsEnum(Gender)
  gender: Gender;

  @ApiProperty({ example: '+919876543210' })
  @Matches(/^\+91[6-9]\d{9}$/, { message: 'phone must be a valid Indian mobile number in format +91XXXXXXXXXX' })
  phone: string;

  @ApiPropertyOptional({ example: '+919876543211' })
  @IsOptional()
  @Matches(/^\+91[6-9]\d{9}$/, { message: 'alternatePhone must be a valid Indian mobile number in format +91XXXXXXXXXX' })
  alternatePhone?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '123 Main Street' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '400001' })
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional({ example: 'O+' })
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @ApiPropertyOptional({ example: '12345678901234' })
  @IsOptional()
  @IsString()
  abhaNumber?: string;

  @ApiPropertyOptional({ example: 'john.doe@abdm' })
  @IsOptional()
  @IsString()
  abhaAddress?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional({ example: '+919876543212' })
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ example: '["Penicillin", "Sulfa"]' })
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional({ example: '["Diabetes", "Hypertension"]' })
  @IsOptional()
  @IsString()
  chronicConditions?: string;

  @ApiPropertyOptional({ example: '{"provider": "Star Health", "policyNumber": "POL123"}' })
  @IsOptional()
  @IsString()
  insuranceInfo?: string;

  @ApiProperty({ description: 'Patient must provide consent to proceed', example: true })
  @IsBoolean()
  @Equals(true, { message: 'Patient consent is required to create a record' })
  consentGiven: boolean;
}
