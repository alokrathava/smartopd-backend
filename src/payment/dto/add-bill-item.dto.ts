import {
  IsUUID,
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ItemType } from '../entities/bill-item.entity';

export class AddBillItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  billId?: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ enum: ItemType })
  @IsEnum(ItemType)
  itemType: ItemType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  gstPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hsnSacCode?: string;
}
