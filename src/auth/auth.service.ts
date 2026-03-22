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
import { Facility } from '../users/entities/facility.entity';
import { FacilitySettings } from '../users/entities/facility-settings.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Otp } from './entities/otp.entity';
import { LoginDto } from './dto/login.dto';
import { OtpRequestDto, OtpVerifyDto } from './dto/otp-request.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterFacilityDto } from './dto/register-facility.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { Role } from '../common/enums/role.enum';
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
    @InjectRepository(Facility) private facilityRepo: Repository<Facility>,
    @InjectRepository(FacilitySettings) private settingsRepo: Repository<FacilitySettings>,
  ) {}

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private buildPayload(user: User): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      facilityId: user.facilityId,
    };
  }

  private signAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      expiresIn: (this.config.get<string>('JWT_EXPIRES_IN') || '15m') as any,
    });
  }

  /**
   * Creates a new refresh token using a selector/secret split.
   * Raw token returned to client: `<selector>.<secret>`
   * Stored in DB: selector (plain, indexed) + bcrypt(secret)
   */
  private async createRefreshToken(
    user: User,
    ip: string,
    userAgent: string,
  ): Promise<string> {
    const selector = uuidv4();
    const secret = uuidv4();
    const hashedSecret = await bcrypt.hash(secret, 10);

    await this.refreshRepo.save({
      userId: user.id,
      facilityId: user.facilityId,
      selector,
      token: hashedSecret,
      expiresAt: dayjs().add(7, 'day').toDate(),
      ipAddress: ip,
      userAgent,
    });

    return `${selector}.${secret}`;
  }

  /** Splits `<selector>.<secret>` and validates against DB. Returns the record. */
  private async validateRefreshToken(rawToken: string): Promise<RefreshToken> {
    const dotIndex = rawToken.indexOf('.');
    if (dotIndex === -1) throw new UnauthorizedException('Malformed refresh token');

    const selector = rawToken.substring(0, dotIndex);
    const secret = rawToken.substring(dotIndex + 1);

    const record = await this.refreshRepo.findOne({ where: { selector } });

    if (
      !record ||
      record.revoked ||
      dayjs().isAfter(record.expiresAt)
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const valid = await bcrypt.compare(secret, record.token);
    if (!valid) throw new UnauthorizedException('Invalid refresh token');

    return record;
  }

  // ── Public methods ────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ip: string, userAgent: string) {
    const user = await this.usersService.findUserByEmail(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Invalid credentials');

    await this.usersService.updateLastLogin(user.id);

    const accessToken = this.signAccessToken(this.buildPayload(user));
    const refreshToken = await this.createRefreshToken(user, ip, userAgent);

    return {
      accessToken,
      refreshToken,
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
    const record = await this.validateRefreshToken(rawToken);

    // Revoke used token (token rotation)
    record.revoked = true;
    await this.refreshRepo.save(record);

    const dbUser = await this.userRepo.findOne({ where: { id: record.userId } });
    if (!dbUser || !dbUser.isActive) throw new UnauthorizedException('User not found or inactive');

    const accessToken = this.signAccessToken(this.buildPayload(dbUser));
    const newRawRefresh = await this.createRefreshToken(dbUser, '', '');

    return { accessToken, refreshToken: newRawRefresh };
  }

  async logout(userId: string) {
    await this.refreshRepo.update({ userId, revoked: false }, { revoked: true });
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const currentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!currentValid) throw new BadRequestException('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must differ from current password');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepo.save(user);

    // Revoke all active refresh tokens — forces re-login on all devices
    await this.refreshRepo.update({ userId, revoked: false }, { revoked: true });

    return { message: 'Password changed successfully. Please log in again.' };
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      facilityId: user.facilityId,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };
  }

  async requestOtp(dto: OtpRequestDto) {
    // Invalidate all existing unused OTPs for this phone+purpose
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

    // TODO: Integrate MSG91 / Twilio for real SMS delivery
    if (this.config.get<string>('NODE_ENV') !== 'production') {
      console.log(`[DEV] OTP for ${dto.phone}: ${code}`);
    }

    return { message: 'OTP sent successfully', phone: dto.phone };
  }

  async verifyOtp(dto: OtpVerifyDto) {
    const otps = await this.otpRepo.find({
      where: { phone: dto.phone, purpose: dto.purpose, used: false },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    let validOtp: Otp | null = null;

    for (const otp of otps) {
      if (dayjs().isAfter(otp.expiresAt)) continue;
      if (otp.attempts >= 3) continue;

      otp.attempts += 1;
      await this.otpRepo.save(otp);

      if (await bcrypt.compare(dto.code, otp.code)) {
        validOtp = otp;
        break;
      }
    }

    if (!validOtp) throw new BadRequestException('Invalid or expired OTP');

    validOtp.used = true;
    await this.otpRepo.save(validOtp);

    return { verified: true, phone: dto.phone, purpose: dto.purpose };
  }

  async registerFacility(dto: RegisterFacilityDto) {
    // Check if email is already in use
    const existing = await this.userRepo.findOne({ where: { email: dto.adminEmail } });
    if (existing) throw new BadRequestException('Email already registered');

    // Create facility
    const facility = this.facilityRepo.create({
      name: dto.facilityName,
      type: dto.facilityType,
      city: dto.city,
      state: dto.state,
      address: dto.address,
      pincode: dto.pincode,
      phone: dto.facilityPhone,
      email: dto.adminEmail,
      isActive: false, // PENDING approval by SUPER_ADMIN
    });
    const savedFacility = await this.facilityRepo.save(facility);

    // Create facility settings
    await this.settingsRepo.save({ facilityId: savedFacility.id });

    // Create FACILITY_ADMIN user
    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);
    const user = this.userRepo.create({
      email: dto.adminEmail,
      firstName: dto.adminFirstName,
      lastName: dto.adminLastName,
      passwordHash,
      role: Role.FACILITY_ADMIN,
      facilityId: savedFacility.id,
      phone: dto.adminPhone,
      isActive: false, // Activated when facility is approved
    });
    const savedUser = await this.userRepo.save(user);

    console.log(`[REGISTRATION] New facility "${savedFacility.name}" registered. Facility ID: ${savedFacility.id}. Pending SUPER_ADMIN approval.`);

    return {
      message: 'Registration successful. Your account is pending approval. You will be notified once activated.',
      facilityId: savedFacility.id,
      adminEmail: savedUser.email,
    };
  }

  async inviteUser(dto: InviteUserDto, inviterFacilityId: string, inviterRole: Role) {
    // Only SUPER_ADMIN or FACILITY_ADMIN can invite
    if (![Role.SUPER_ADMIN, Role.FACILITY_ADMIN].includes(inviterRole)) {
      throw new UnauthorizedException('Insufficient permissions to invite users');
    }

    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already registered');

    const inviteToken = uuidv4();
    const tempPassword = await bcrypt.hash(uuidv4(), 10); // Random temp password

    const user = this.userRepo.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash: tempPassword,
      role: dto.role,
      facilityId: inviterFacilityId,
      phone: dto.phone,
      isActive: false,
      inviteToken,
      inviteExpiresAt: dayjs().add(7, 'day').toDate(),
    });
    await this.userRepo.save(user);

    console.log(`[INVITE] Invite for ${dto.email} — Token: ${inviteToken}`);

    return {
      message: `Invitation sent to ${dto.email}`,
      inviteToken, // In production: send via email/SMS only, don't return in response
    };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const user = await this.userRepo.findOne({ where: { inviteToken: dto.inviteToken } });
    if (!user) throw new BadRequestException('Invalid invite token');
    if (dayjs().isAfter(user.inviteExpiresAt)) throw new BadRequestException('Invite token has expired');

    user.passwordHash = await bcrypt.hash(dto.password, 12);
    user.isActive = true;
    user.inviteToken = null!;
    user.inviteExpiresAt = null!;
    await this.userRepo.save(user);

    return { message: 'Account activated. You can now log in.' };
  }
}
