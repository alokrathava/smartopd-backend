import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'doctor@hospital.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password@123' })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'Required for all roles except SUPER_ADMIN' })
  @IsOptional()
  @IsString()
  facilityId?: string;
}
