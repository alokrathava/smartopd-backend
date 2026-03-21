import { IsBoolean, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteConsultationDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isComplete?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  advice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  followUpInstructions?: string;
}
