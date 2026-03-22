import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class InviteUserDto {
  @ApiProperty({ example: 'doctor@hospital.com' }) @IsEmail() email: string;
  @ApiProperty({ example: 'Priya' }) @IsNotEmpty() @IsString() firstName: string;
  @ApiProperty({ example: 'Verma' }) @IsNotEmpty() @IsString() lastName: string;
  @ApiProperty({ enum: Role, example: Role.DOCTOR }) @IsEnum(Role) role: Role;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
}
