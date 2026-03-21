import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { OtpRequestDto, OtpVerifyDto } from './dto/otp-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req.ip || '', req.headers['user-agent'] || '');
  }

  @Public()
  @Post('refresh')
  refresh(@Body('refreshToken') token: string) {
    return this.authService.refresh(token);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.sub);
  }

  @Public()
  @Post('otp/request')
  requestOtp(@Body() dto: OtpRequestDto) {
    return this.authService.requestOtp(dto);
  }

  @Public()
  @Post('otp/verify')
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto);
  }
}
