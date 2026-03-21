import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class CreateUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @IsNotEmpty() firstName: string;
  @ApiProperty() @IsString() @IsNotEmpty() lastName: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
  @ApiProperty({ enum: Role }) @IsEnum(Role) role: Role;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorProfile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nurseProfile?: string;
}
