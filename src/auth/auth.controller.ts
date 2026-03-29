import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { OtpRequestDto, OtpVerifyDto } from './dto/otp-request.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterFacilityDto } from './dto/register-facility.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Public endpoints ─────────────────────────────────────────────────────────

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Returns a short-lived access token (15 min) and a 7-day rotating refresh token.',
  })
  @ApiOkResponse({
    description: 'Login successful',
    schema: {
      example: {
        accessToken: 'eyJhbGci...',
        refreshToken: '<selector>.<secret>',
        user: {
          id: 'uuid',
          email: 'doctor@hospital.com',
          role: 'DOCTOR',
          facilityId: 'uuid',
          firstName: 'Amit',
          lastName: 'Sharma',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or inactive account',
  })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(
      dto,
      req.ip || '',
      req.headers['user-agent'] || '',
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh token',
    description:
      'Exchanges a valid refresh token for a new access token and a new refresh token (token rotation). The old refresh token is immediately revoked.',
  })
  @ApiOkResponse({
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        accessToken: 'eyJhbGci...',
        refreshToken: '<new-selector>.<new-secret>',
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token is invalid, expired, or already revoked',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request an OTP',
    description:
      'Sends a 6-digit OTP to the provided phone number. Any previous unused OTP for the same phone+purpose is invalidated. OTP expires in 5 minutes. Max 3 wrong attempts before the OTP is locked.',
  })
  @ApiOkResponse({
    description: 'OTP dispatched',
    schema: {
      example: { message: 'OTP sent successfully', phone: '+919876543210' },
    },
  })
  requestOtp(@Body() dto: OtpRequestDto) {
    return this.authService.requestOtp(dto);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify an OTP',
    description: 'Validates the 6-digit OTP for the given phone and purpose.',
  })
  @ApiOkResponse({
    description: 'OTP verified',
    schema: {
      example: { verified: true, phone: '+919876543210', purpose: 'LOGIN' },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired OTP, or max attempts exceeded',
  })
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new facility (hospital/clinic)',
    description:
      'Self-registration for new hospitals. Creates the facility + FACILITY_ADMIN account. Facility starts in PENDING state and requires SUPER_ADMIN activation.',
  })
  @ApiCreatedResponse({
    schema: {
      example: {
        message: 'Registration successful. Pending approval.',
        facilityId: 'uuid',
        adminEmail: 'admin@hospital.com',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Email already registered' })
  registerFacility(@Body() dto: RegisterFacilityDto) {
    return this.authService.registerFacility(dto);
  }

  @Public()
  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept an invitation and set password',
    description:
      'Staff member uses their invite token to activate their account and set a password.',
  })
  @ApiOkResponse({
    schema: { example: { message: 'Account activated. You can now log in.' } },
  })
  @ApiBadRequestResponse({ description: 'Invalid or expired invite token' })
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto);
  }

  // ── Protected endpoints ───────────────────────────────────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Invite a staff member',
    description:
      'FACILITY_ADMIN or SUPER_ADMIN invites a new staff member by email. An invite token is generated (valid 7 days). In production, this is sent via email.',
  })
  @ApiCreatedResponse({
    schema: {
      example: {
        message: 'Invitation sent to doctor@hospital.com',
        inviteToken: 'uuid-token',
      },
    },
  })
  inviteUser(@Body() dto: InviteUserDto, @CurrentUser() user: JwtPayload) {
    return this.authService.inviteUser(dto, user.facilityId!, user.role as any);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the profile of the authenticated user derived from the JWT.',
  })
  @ApiOkResponse({
    description: 'Current user profile',
    schema: {
      example: {
        id: 'uuid',
        email: 'doctor@hospital.com',
        role: 'DOCTOR',
        facilityId: 'uuid',
        firstName: 'Amit',
        lastName: 'Sharma',
        isActive: true,
        lastLoginAt: '2025-01-01T10:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password',
    description:
      'Allows an authenticated user to change their password. All active refresh tokens are revoked on success (forces re-login on all devices).',
  })
  @ApiOkResponse({
    description: 'Password changed successfully',
    schema: {
      example: {
        message: 'Password changed successfully. Please log in again.',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Current password is incorrect or new password is same as old',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.sub, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout',
    description:
      'Revokes all active refresh tokens and blacklists the current access token in Redis. Subsequent requests with the same access token will be rejected immediately.',
  })
  @ApiOkResponse({
    description: 'Logged out successfully',
    schema: { example: { message: 'Logged out successfully' } },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  logout(@CurrentUser() user: JwtPayload, @Req() req: Request) {
    // Extract raw access token for blacklisting
    const authHeader = (req as any).headers?.authorization as string | undefined;
    const accessToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;
    return this.authService.logout(user.sub, accessToken);
  }
}
