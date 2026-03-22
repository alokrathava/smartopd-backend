import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignBedDto {
  @ApiProperty() @IsUUID() bedId: string;
  @ApiProperty() @IsUUID() roomId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
