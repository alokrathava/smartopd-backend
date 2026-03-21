import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FacilityType } from '../entities/facility.entity';

export class CreateFacilityDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty({ enum: FacilityType }) @IsEnum(FacilityType) type: FacilityType;
  @ApiPropertyOptional() @IsOptional() @IsString() registrationNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() pincode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() gstNumber?: string;
}
