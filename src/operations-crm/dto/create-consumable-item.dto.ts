import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConsumableItemDto {
  @ApiProperty() @IsString() itemCode: string;
  @ApiProperty() @IsString() itemName: string;
  @ApiProperty({ example: 'SURGICAL' }) @IsString() category: string;
  @ApiProperty({ example: 'piece' }) @IsString() unit: string;
  @ApiProperty() @IsNumber() @Min(0) unitCost: number;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}
