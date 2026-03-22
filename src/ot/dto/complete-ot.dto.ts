import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteOtDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() actualEnd?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() intraOpNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() postOpNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() postOpBedId?: string;
}
