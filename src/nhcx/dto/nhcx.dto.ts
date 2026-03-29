import {
  IsUUID, IsEnum, IsString, IsOptional, IsNumber, Min, IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NhcxClaimType, NhcxClaimStatus } from '../entities/nhcx-claim-record.entity';

export class CreateClaimDto {
  @ApiProperty({ description: 'Patient ID' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ enum: NhcxClaimType })
  @IsEnum(NhcxClaimType)
  claimType: NhcxClaimType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  visitId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  admissionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  billId?: string;

  @ApiProperty({ description: 'Insurance payer name', example: 'Star Health' })
  @IsString()
  @IsNotEmpty()
  payerName: string;

  @ApiProperty({ description: 'Policy number', example: 'POL-123456' })
  @IsString()
  @IsNotEmpty()
  policyNumber: string;

  @ApiProperty({ description: 'Member / beneficiary ID' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({ description: 'Claimed amount in INR', example: 25000 })
  @IsNumber()
  @Min(1)
  claimedAmount: number;
}

export class UpdateClaimStatusDto {
  @ApiProperty({ enum: NhcxClaimStatus })
  @IsEnum(NhcxClaimStatus)
  status: NhcxClaimStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  approvedAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  denialReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  queryText?: string;
}

export class ClaimQueryDto {
  @ApiPropertyOptional({ enum: NhcxClaimStatus })
  @IsOptional()
  @IsEnum(NhcxClaimStatus)
  status?: NhcxClaimStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;
}
