import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '../entities/notification-log.entity';

export class CreateTemplateDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty()
  @IsString()
  bodyTemplate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
