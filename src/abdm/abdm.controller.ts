import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AbdmService } from './abdm.service';
import {
  GenerateAadhaarOtpDto,
  VerifyAadhaarOtpDto,
  InitM2LinkDto,
  ConfirmM2LinkDto,
  RequestM3ConsentDto,
} from './dto/abdm.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { Public } from '../common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('ABDM')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('abdm')
export class AbdmController {
  constructor(private readonly abdmService: AbdmService) {}

  // ─── M1: ABHA Creation ─────────────────────────────────────────────────────

  @Post('m1/generate-otp')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: 'M1 Step 1: Send OTP to Aadhaar-linked mobile for ABHA creation',
  })
  generateAadhaarOtp(
    @Body() dto: GenerateAadhaarOtpDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.abdmService.generateAadhaarOtp(dto, user.facilityId!);
  }

  @Post('m1/verify-otp')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({
    summary: 'M1 Step 2: Verify OTP → creates and links ABHA number',
  })
  verifyAadhaarOtpAndCreateAbha(
    @Body() dto: VerifyAadhaarOtpDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.abdmService.verifyAadhaarOtpAndCreateAbha(
      dto,
      user.facilityId!,
    );
  }

  // ─── M2: KYC & Record Linking ──────────────────────────────────────────────

  @Post('m2/init-link')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'M2 Step 1: Initiate KYC & health record linking via ABHA number',
  })
  initiateM2Link(@Body() dto: InitM2LinkDto, @CurrentUser() user: JwtPayload) {
    return this.abdmService.initiateM2Link(dto, user.facilityId!);
  }

  @Post('m2/confirm-link')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'M2 Step 2: Confirm OTP → completes KYC_AND_LINK' })
  confirmM2Link(
    @Body() dto: ConfirmM2LinkDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.abdmService.confirmM2Link(dto, user.facilityId!);
  }

  // ─── M3: HIU Consent + Health Record Pull ─────────────────────────────────

  @Post('m3/request-consent')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'M3: Request patient consent to pull ABDM health records',
  })
  requestConsent(
    @Body() dto: RequestM3ConsentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.abdmService.requestConsent(dto, user.facilityId!);
  }

  @Get('patient/:patientId/history')
  @Roles(
    Role.DOCTOR,
    Role.NURSE,
    Role.RECEPTIONIST,
    Role.FACILITY_ADMIN,
    Role.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get all ABDM interaction records for a patient' })
  getPatientHistory(
    @Param('patientId') patientId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.abdmService.getPatientAbdmHistory(patientId, user.facilityId!);
  }

  // ─── ABDM Webhook (Public — called by ABDM gateway) ───────────────────────

  @Public()
  @Post('webhook/consent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ABDM webhook: consent grant/deny callbacks from ABDM gateway',
  })
  handleConsentWebhook(@Body() body: any) {
    const { consentArtefactId, status, hipId } = body;
    if (status === 'GRANTED' && consentArtefactId) {
      return this.abdmService.handleConsentGranted(consentArtefactId, hipId);
    }
    return { received: true };
  }
}
