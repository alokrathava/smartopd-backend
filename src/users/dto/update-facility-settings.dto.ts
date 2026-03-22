import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFacilitySettingsDto {
  @ApiPropertyOptional({ example: '09:00' }) @IsOptional() @IsString() opdStartTime?: string;
  @ApiPropertyOptional({ example: '18:00' }) @IsOptional() @IsString() opdEndTime?: string;
  @ApiPropertyOptional({ example: 15 }) @IsOptional() @IsNumber() @Min(5) @Max(60) slotDurationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableSms?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableWhatsApp?: boolean;
  @ApiPropertyOptional({ example: 'INR' }) @IsOptional() @IsString() defaultCurrency?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() nhcxEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() pharmacyOtpRequired?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() consultationFeeDefault?: number;
  @ApiPropertyOptional({ description: 'HTML for prescription/bill letterhead' }) @IsOptional() @IsString() letterheadHtml?: string;

  // Branding
  @ApiPropertyOptional({ example: 'City Hospital' }) @IsOptional() @IsString() brandName?: string;
  @ApiPropertyOptional({ example: '#2563EB', description: 'Hex color code' }) @IsOptional() @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Must be a valid hex color e.g. #2563EB' }) primaryColor?: string;
  @ApiPropertyOptional({ example: '#1E40AF' }) @IsOptional() @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Must be a valid hex color' }) secondaryColor?: string;
  @ApiPropertyOptional({ example: '#0EA5E9' }) @IsOptional() @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Must be a valid hex color' }) accentColor?: string;
  @ApiPropertyOptional({ example: 'Inter' }) @IsOptional() @IsString() fontFamily?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supportPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supportEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() welcomeMessage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() footerText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() customCssUrl?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() showPoweredBy?: boolean;

  // Kiosk
  @ApiPropertyOptional({ example: 'en' }) @IsOptional() @IsString() defaultLanguage?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableFaceKiosk?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enableOpdQueue?: boolean;
}
