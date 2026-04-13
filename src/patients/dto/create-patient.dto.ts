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
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class CreatePatientDto {
  @ApiProperty({ example: 'John' })
  @Sanitize()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Sanitize()
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
  @Matches(/^\+91[6-9]\d{9}$/, {
    message:
      'phone must be a valid Indian mobile number in format +91XXXXXXXXXX',
  })
  phone: string;

  @ApiPropertyOptional({ example: '+919876543211' })
  @IsOptional()
  @Matches(/^\+91[6-9]\d{9}$/, {
    message:
      'alternatePhone must be a valid Indian mobile number in format +91XXXXXXXXXX',
  })
  alternatePhone?: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @Sanitize()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '123 Main Street' })
  @Sanitize()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @Sanitize()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @Sanitize()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '400001' })
  @Sanitize()
  @IsOptional()
  @IsString()
  pincode?: string;

  @ApiPropertyOptional({ example: 'O+' })
  @Sanitize()
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @ApiPropertyOptional({ example: '12345678901234' })
  @Sanitize()
  @IsOptional()
  @IsString()
  abhaNumber?: string;

  @ApiPropertyOptional({ example: 'john.doe@abdm' })
  @Sanitize()
  @IsOptional()
  @IsString()
  abhaAddress?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @Sanitize()
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional({ example: '+919876543212' })
  @Sanitize()
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ example: '["Penicillin", "Sulfa"]' })
  @Sanitize()
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional({ example: '["Diabetes", "Hypertension"]' })
  @Sanitize()
  @IsOptional()
  @IsString()
  chronicConditions?: string;

  @ApiPropertyOptional({
    example: '{"provider": "Star Health", "policyNumber": "POL123"}',
  })
  @Sanitize()
  @IsOptional()
  @IsString()
  insuranceInfo?: string;

  @ApiProperty({
    description: 'Patient must provide consent to proceed',
    example: true,
  })
  @IsBoolean()
  @Equals(true, { message: 'Patient consent is required to create a record' })
  consentGiven: boolean;
}
