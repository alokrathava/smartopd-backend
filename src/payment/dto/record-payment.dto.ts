import { IsUUID, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentMode } from '../entities/payment-transaction.entity';

export class RecordPaymentDto {
  @ApiProperty()
  @IsUUID()
  billId: string;

  @ApiProperty()
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiProperty({ enum: PaymentMode })
  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  upiTransactionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
