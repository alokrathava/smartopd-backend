import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FacilityType } from '../../users/entities/facility.entity';

export class RegisterFacilityDto {
  // Facility info
  @ApiProperty({
    example: 'City General Hospital',
    description: 'Hospital / clinic name',
  })
  @IsNotEmpty()
  @IsString()
  facilityName: string;

  @ApiProperty({ enum: FacilityType, default: FacilityType.HOSPITAL })
  @IsEnum(FacilityType)
  facilityType: FacilityType;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  city?: string;
  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pincode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() facilityPhone?: string;

  // Admin user info
  @ApiProperty({ example: 'admin@cityhospital.com' })
  @IsEmail()
  adminEmail: string;
  @ApiProperty({ example: 'Rajesh' })
  @IsNotEmpty()
  @IsString()
  adminFirstName: string;
  @ApiProperty({ example: 'Sharma' })
  @IsNotEmpty()
  @IsString()
  adminLastName: string;
  @ApiProperty({
    description: 'Min 8 chars, must have uppercase/lowercase/digit/special',
    example: 'Admin@1234',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
    {
      message:
        'Password must have uppercase, lowercase, digit, and special character',
    },
  )
  adminPassword: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+91[0-9]{10}$/, { message: 'Phone must be +91XXXXXXXXXX' })
  adminPhone?: string;
}
