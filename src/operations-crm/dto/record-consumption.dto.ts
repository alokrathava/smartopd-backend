import { IsString, IsUUID, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordConsumptionDto {
  @ApiProperty() @IsUUID() wardId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() admissionId?: string;
  @ApiProperty() @IsUUID() consumableItemId: string;
  @ApiProperty() @IsInt() @Min(1) quantity: number;
  @ApiProperty() @IsUUID() usedBy: string;
  @ApiPropertyOptional() @IsOptional() @IsString() purpose?: string;
}
