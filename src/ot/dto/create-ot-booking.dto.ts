import {
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtUrgency } from '../entities/ot-booking.entity';

export class CreateOtBookingDto {
  @ApiProperty() @IsUUID() patientId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() admissionId?: string;
  @ApiProperty() @IsUUID() surgeonId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() anaesthetistId?: string;
  @ApiProperty() @IsUUID() otRoomId: string;
  @ApiProperty({ example: '2025-04-01T08:00:00.000Z' }) @IsDateString() scheduledStart: string;
  @ApiProperty({ example: '2025-04-01T10:00:00.000Z' }) @IsDateString() scheduledEnd: string;
  @ApiProperty() @IsString() procedureName: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsString({ each: true }) cptCodes?: string[];
  @ApiPropertyOptional({ enum: OtUrgency, default: OtUrgency.ELECTIVE })
  @IsOptional()
  @IsEnum(OtUrgency)
  urgency?: OtUrgency;
  @ApiPropertyOptional() @IsOptional() @IsUUID() postOpBedId?: string;
}
