/**
 * DTOs for Payment Provider Integration
 */

import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../enums/payment-method.enum';

export class InitiatePaymentDto {
  @ApiProperty({ description: 'Payment method' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ description: 'Amount to be paid' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Currency code (e.g., INR, USD)' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Payment description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Customer email' })
  @IsOptional()
  @IsString()
  customerEmail?: string;

  @ApiPropertyOptional({ description: 'Customer phone number' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the provider' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Transaction reference from provider' })
  @IsString()
  transactionRef: string;

  @ApiProperty({ description: 'Payment amount' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ description: 'Metadata from provider' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RefundPaymentDto {
  @ApiPropertyOptional({
    description: 'Partial refund amount (if not specified, full refund)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ description: 'Reason for refund' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PaymentAvailabilityDto {
  @ApiPropertyOptional({ description: 'Region: INDIA or INTERNATIONAL' })
  @IsOptional()
  @IsString()
  region?: 'INDIA' | 'INTERNATIONAL';
}

/**
 * Response DTOs
 */

export class PaymentInitResponseDto {
  @ApiProperty()
  paymentId: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  provider: PaymentMethod;

  @ApiProperty()
  status: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiPropertyOptional()
  checkoutUrl?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class PaymentStatusResponseDto {
  @ApiProperty()
  paymentId: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  provider: PaymentMethod;

  @ApiProperty()
  timestamp: Date;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class AvailableProvidersResponseDto {
  @ApiProperty({ type: [String], enum: Object.values(PaymentMethod) })
  availableMethods: PaymentMethod[];

  @ApiProperty()
  recommended: PaymentMethod;
}
