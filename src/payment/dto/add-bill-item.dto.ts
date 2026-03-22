import {
  IsUUID,
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ItemType } from '../entities/bill-item.entity';

export class AddBillItemDto {
  @ApiProperty()
  @IsUUID()
  billId: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ enum: ItemType })
  @IsEnum(ItemType)
  itemType: ItemType;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  unitPrice: number;

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
