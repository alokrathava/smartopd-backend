import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Otp } from './entities/otp.entity';
import { LoginDto } from './dto/login.dto';
import { OtpRequestDto, OtpVerifyDto } from './dto/otp-request.dto';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    @InjectRepository(RefreshToken) private refreshRepo: Repository<RefreshToken>,
    @InjectRepository(Otp) private otpRepo: Repository<Otp>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const user = await this.usersService.findUserByEmail(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.usersService.updateLastLogin(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      facilityId: user.facilityId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
    });

    const rawRefresh = uuidv4();
    const hashedRefresh = await bcrypt.hash(rawRefresh, 10);
    await this.refreshRepo.save({
      userId: user.id,
      facilityId: user.facilityId,
      token: hashedRefresh,
      expiresAt: dayjs().add(7, 'day').toDate(),
      ipAddress: ip,
      userAgent,
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        facilityId: user.facilityId,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async refresh(rawToken: string) {
    const tokens = await this.refreshRepo.find({ where: { revoked: false } });
    let found: RefreshToken | null = null;

    for (const t of tokens) {
      if (!t.revoked && dayjs().isBefore(t.expiresAt) && (await bcrypt.compare(rawToken, t.token))) {
        found = t;
        break;
      }
    }

    if (!found) throw new UnauthorizedException('Invalid refresh token');

    found.revoked = true;
    await this.refreshRepo.save(found);

    const dbUser = await this.userRepo.findOne({ where: { id: found.userId } });
    if (!dbUser) throw new UnauthorizedException('User not found');

    const payload: JwtPayload = {
      sub: dbUser.id,
      email: dbUser.email,
      role: dbUser.role,
      facilityId: dbUser.facilityId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.config.get('JWT_EXPIRES_IN') || '15m',
    });

    const newRaw = uuidv4();
    await this.refreshRepo.save({
      userId: dbUser.id,
      facilityId: dbUser.facilityId,
      token: await bcrypt.hash(newRaw, 10),
      expiresAt: dayjs().add(7, 'day').toDate(),
    });

    return { accessToken, refreshToken: newRaw };
  }

  async logout(userId: string) {
    await this.refreshRepo.update({ userId, revoked: false }, { revoked: true });
    return { message: 'Logged out successfully' };
  }

  async requestOtp(dto: OtpRequestDto) {
    await this.otpRepo.update(
      { phone: dto.phone, purpose: dto.purpose, used: false },
      { used: true },
    );

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = await bcrypt.hash(code, 10);

    await this.otpRepo.save({
      phone: dto.phone,
      purpose: dto.purpose,
      facilityId: dto.facilityId || null,
      code: hashed,
      expiresAt: dayjs().add(5, 'minute').toDate(),
    });

    // TODO: Integrate MSG91 / Twilio for real SMS
    console.log(`[DEV] OTP for ${dto.phone}: ${code}`);

    return { message: 'OTP sent successfully', phone: dto.phone };
  }

  async verifyOtp(dto: OtpVerifyDto) {
    const otps = await this.otpRepo.find({
      where: { phone: dto.phone, purpose: dto.purpose, used: false },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    let valid: Otp | null = null;
    for (const otp of otps) {
      if (dayjs().isAfter(otp.expiresAt)) continue;
      if (otp.attempts >= 3) continue;
      otp.attempts += 1;
      await this.otpRepo.save(otp);
      if (await bcrypt.compare(dto.code, otp.code)) {
        valid = otp;
        break;
      }
    }

    if (!valid) throw new BadRequestException('Invalid or expired OTP');

    valid.used = true;
    await this.otpRepo.save(valid);

    return { verified: true, phone: dto.phone, purpose: dto.purpose };
  }
}
