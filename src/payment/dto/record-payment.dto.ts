import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentMode } from '../entities/payment-transaction.entity';

export class RecordPaymentDto {
  @ApiProperty()
  @IsUUID()
  billId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @ApiProperty({ enum: PaymentMode })
  @IsEnum(PaymentMode)
  method: PaymentMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
