import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'doctor@hospital.com',
    description: 'Registered email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password@123', description: 'Minimum 8 characters' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @ApiPropertyOptional({
    description: 'Required for all roles except SUPER_ADMIN',
  })
  @IsOptional()
  @IsString()
  facilityId?: string;
}
