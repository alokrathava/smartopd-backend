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
import { Role } from '../../common/enums/role.enum';

/** Rejects strings containing raw HTML angle-bracket characters */
const NO_HTML = /^[^<>]*$/;

export class CreateUserDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(NO_HTML, { message: 'firstName must not contain HTML' })
  firstName: string;
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(NO_HTML, { message: 'lastName must not contain HTML' })
  lastName: string;
  @ApiProperty() @IsString() @MinLength(8) password: string;
  @ApiProperty({ enum: Role }) @IsEnum(Role) role: Role;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() doctorProfile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nurseProfile?: string;
}
