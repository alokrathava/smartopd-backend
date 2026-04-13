import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Sanitize } from '../../common/decorators/sanitize.decorator';

export class CreateCampaignDto {
  @ApiProperty()
  @Sanitize()
  @IsString()
  name: string;

  @ApiProperty()
  @Sanitize()
  @IsString()
  channel: string;

  @ApiProperty()
  @IsUUID()
  segmentId: string;

  @ApiPropertyOptional()
  @Sanitize()
  @IsOptional()
  @IsString()
  templateCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
