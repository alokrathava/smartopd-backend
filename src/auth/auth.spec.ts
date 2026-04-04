import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import dayjs from 'dayjs';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
import { QueueService } from '../queue/queue.service';
import { User } from '../users/entities/user.entity';
import { Facility } from '../users/entities/facility.entity';
import { FacilitySettings } from '../users/entities/facility-settings.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Otp, OtpPurpose } from './entities/otp.entity';
import { Role } from '../common/enums/role.enum';

// ── Shared mock factory ────────────────────────────────────────────────────────

function makeRepo() {
  return {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      getOne: jest.fn(),
      getCount: jest.fn(),
    })),
  };
}

// ── Test suite ─────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  let refreshRepo: ReturnType<typeof makeRepo>;
  let otpRepo: ReturnType<typeof makeRepo>;
  let userRepo: ReturnType<typeof makeRepo>;
  let facilityRepo: ReturnType<typeof makeRepo>;
  let settingsRepo: ReturnType<typeof makeRepo>;

  let jwtService: { sign: jest.Mock; decode: jest.Mock };
  let configService: { get: jest.Mock };
  let redisService: {
    blacklistToken: jest.Mock;
    isTokenBlacklisted: jest.Mock;
  };
  let queueService: { enqueueSms: jest.Mock };
  let usersService: {
    findUserByEmail: jest.Mock;
    updateLastLogin: jest.Mock;
  };

  // Reusable base user object
  const baseUser: Partial<User> = {
    id: 'user-uuid-1',
    email: 'admin@hospital.com',
    passwordHash: '',
    role: Role.FACILITY_ADMIN,
    facilityId: 'facility-uuid-1',
    firstName: 'John',
    lastName: 'Doe',
    isActive: true,
    lastLoginAt: new Date(),
  };

  beforeAll(async () => {
    // Pre-hash a known password for reuse across tests
    (baseUser as any).passwordHash = await bcrypt.hash('Password@123', 10);
  });

  beforeEach(async () => {
    refreshRepo = makeRepo();
    otpRepo = makeRepo();
    userRepo = makeRepo();
    facilityRepo = makeRepo();
    settingsRepo = makeRepo();

    jwtService = {
      sign: jest.fn().mockReturnValue('signed-access-token'),
      decode: jest.fn(),
    };
    configService = { get: jest.fn().mockReturnValue('15m') };
    redisService = {
      blacklistToken: jest.fn().mockResolvedValue(undefined),
      isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    };
    queueService = { enqueueSms: jest.fn().mockResolvedValue(undefined) };
    usersService = {
      findUserByEmail: jest.fn(),
      updateLastLogin: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: RedisService, useValue: redisService },
        { provide: QueueService, useValue: queueService },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
        { provide: getRepositoryToken(Otp), useValue: otpRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Facility), useValue: facilityRepo },
        {
          provide: getRepositoryToken(FacilitySettings),
          useValue: settingsRepo,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── login ───────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('returns accessToken, refreshToken and user profile on valid credentials', async () => {
      usersService.findUserByEmail.mockResolvedValue(baseUser);
      refreshRepo.save.mockResolvedValue({});

      const result = await service.login(
        { email: baseUser.email!, password: 'Password@123' },
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(baseUser.email);
      expect(usersService.updateLastLogin).toHaveBeenCalledWith(baseUser.id);
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      usersService.findUserByEmail.mockResolvedValue(null);

      await expect(
        service.login(
          { email: 'ghost@x.com', password: 'Password@123' },
          '',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      usersService.findUserByEmail.mockResolvedValue({
        ...baseUser,
        isActive: false,
      });

      await expect(
        service.login(
          { email: baseUser.email!, password: 'Password@123' },
          '',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      usersService.findUserByEmail.mockResolvedValue(baseUser);

      await expect(
        service.login(
          { email: baseUser.email!, password: 'WrongPass1!' },
          '',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not call updateLastLogin when password fails', async () => {
      usersService.findUserByEmail.mockResolvedValue(baseUser);

      await expect(
        service.login(
          { email: baseUser.email!, password: 'bad-password' },
          '',
          '',
        ),
      ).rejects.toThrow(UnauthorizedException);

      expect(usersService.updateLastLogin).not.toHaveBeenCalled();
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('revokes all refresh tokens for the user', async () => {
      refreshRepo.update.mockResolvedValue({ affected: 2 });

      const result = await service.logout('user-uuid-1');

      expect(refreshRepo.update).toHaveBeenCalledWith(
        { userId: 'user-uuid-1', revoked: false },
        { revoked: true },
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('blacklists the access token in Redis when provided', async () => {
      refreshRepo.update.mockResolvedValue({});
      jwtService.decode.mockReturnValue({
        jti: 'some-jti',
        exp: Math.floor(Date.now() / 1000) + 900,
      });

      await service.logout('user-uuid-1', 'some-raw-access-token');

      expect(redisService.blacklistToken).toHaveBeenCalledWith(
        'some-jti',
        expect.any(Number),
      );
    });

    it('skips Redis blacklist when no access token is supplied', async () => {
      refreshRepo.update.mockResolvedValue({});

      await service.logout('user-uuid-1');

      expect(redisService.blacklistToken).not.toHaveBeenCalled();
    });
  });

  // ── registerFacility ────────────────────────────────────────────────────────

  describe('registerFacility()', () => {
    const dto = {
      facilityName: 'City Clinic',
      facilityType: 'CLINIC' as any,
      city: 'Mumbai',
      state: 'MH',
      address: '123 Street',
      pincode: '400001',
      facilityPhone: '+919876543210',
      adminEmail: 'admin@cityclinic.com',
      adminFirstName: 'Jane',
      adminLastName: 'Smith',
      adminPassword: 'Admin@1234',
      adminPhone: '+919876543211',
    };

    it('creates a facility, settings and admin user on success', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const savedFacility = { id: 'fac-001', name: dto.facilityName };
      facilityRepo.create.mockReturnValue(savedFacility);
      facilityRepo.save.mockResolvedValue(savedFacility);
      settingsRepo.save.mockResolvedValue({});
      const savedUser = { id: 'usr-001', email: dto.adminEmail };
      userRepo.create.mockReturnValue(savedUser);
      userRepo.save.mockResolvedValue(savedUser);

      const result = await service.registerFacility(dto);

      expect(facilityRepo.save).toHaveBeenCalled();
      expect(settingsRepo.save).toHaveBeenCalled();
      expect(userRepo.save).toHaveBeenCalled();
      expect(result.facilityId).toBe(savedFacility.id);
      expect(result.adminEmail).toBe(dto.adminEmail);
    });

    it('throws ConflictException if admin email is already registered', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'existing-user' });

      await expect(service.registerFacility(dto)).rejects.toThrow(
        ConflictException,
      );
      expect(facilityRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── requestOtp ──────────────────────────────────────────────────────────────

  describe('requestOtp()', () => {
    it('invalidates old OTPs, saves a hashed new OTP and enqueues an SMS', async () => {
      otpRepo.update.mockResolvedValue({});
      otpRepo.save.mockResolvedValue({});

      const result = await service.requestOtp({
        phone: '+919876543210',
        purpose: OtpPurpose.LOGIN,
      });

      expect(otpRepo.update).toHaveBeenCalledWith(
        { phone: '+919876543210', purpose: OtpPurpose.LOGIN, used: false },
        { used: true },
      );
      expect(otpRepo.save).toHaveBeenCalled();
      const savedArg = otpRepo.save.mock.calls[0][0] as any;
      // The saved OTP code must be a bcrypt hash (starts with $2)
      expect(savedArg.code).toMatch(/^\$2/);
      expect(queueService.enqueueSms).toHaveBeenCalledWith(
        expect.objectContaining({ to: '+919876543210' }),
      );
      expect(result).toEqual({
        message: 'OTP sent successfully',
        phone: '+919876543210',
      });
    });

    it('sets expiresAt ~5 minutes in the future', async () => {
      otpRepo.update.mockResolvedValue({});
      otpRepo.save.mockResolvedValue({});

      await service.requestOtp({
        phone: '+919876543210',
        purpose: OtpPurpose.LOGIN,
      });

      const saved = otpRepo.save.mock.calls[0][0] as any;
      const diffMinutes = dayjs(saved.expiresAt).diff(dayjs(), 'minute');
      expect(diffMinutes).toBeGreaterThanOrEqual(4);
      expect(diffMinutes).toBeLessThanOrEqual(5);
    });
  });

  // ── verifyOtp ───────────────────────────────────────────────────────────────

  describe('verifyOtp()', () => {
    it('returns verified:true and marks OTP as used when code matches', async () => {
      const rawCode = '482910';
      const hashed = await bcrypt.hash(rawCode, 10);
      const futureExpiry = dayjs().add(3, 'minute').toDate();

      const otpRecord = {
        id: 'otp-1',
        phone: '+919876543210',
        purpose: OtpPurpose.LOGIN,
        code: hashed,
        expiresAt: futureExpiry,
        attempts: 0,
        used: false,
      };

      otpRepo.find.mockResolvedValue([otpRecord]);
      otpRepo.save.mockResolvedValue({ ...otpRecord, attempts: 1 });

      const result = await service.verifyOtp({
        phone: '+919876543210',
        code: rawCode,
        purpose: OtpPurpose.LOGIN,
      });

      expect(result.verified).toBe(true);
      expect(otpRecord.used).toBe(true);
    });

    it('throws BadRequestException when OTP has expired', async () => {
      const rawCode = '482910';
      const hashed = await bcrypt.hash(rawCode, 10);
      const pastExpiry = dayjs().subtract(1, 'minute').toDate();

      const otpRecord = {
        id: 'otp-1',
        code: hashed,
        expiresAt: pastExpiry,
        attempts: 0,
        used: false,
        phone: '+919876543210',
        purpose: OtpPurpose.LOGIN,
      };

      otpRepo.find.mockResolvedValue([otpRecord]);

      await expect(
        service.verifyOtp({
          phone: '+919876543210',
          code: rawCode,
          purpose: OtpPurpose.LOGIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when code is incorrect', async () => {
      const hashed = await bcrypt.hash('999999', 10);
      const futureExpiry = dayjs().add(3, 'minute').toDate();

      const otpRecord = {
        id: 'otp-1',
        code: hashed,
        expiresAt: futureExpiry,
        attempts: 0,
        used: false,
        phone: '+919876543210',
        purpose: OtpPurpose.LOGIN,
      };

      otpRepo.find.mockResolvedValue([otpRecord]);
      otpRepo.save.mockResolvedValue(otpRecord);

      await expect(
        service.verifyOtp({
          phone: '+919876543210',
          code: '111111',
          purpose: OtpPurpose.LOGIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when no OTPs exist for that phone', async () => {
      otpRepo.find.mockResolvedValue([]);

      await expect(
        service.verifyOtp({
          phone: '+919000000000',
          code: '123456',
          purpose: OtpPurpose.LOGIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('skips OTPs that have already reached 3 attempts', async () => {
      const rawCode = '482910';
      const hashed = await bcrypt.hash(rawCode, 10);

      const exhaustedOtp = {
        id: 'otp-exhausted',
        code: hashed,
        expiresAt: dayjs().add(3, 'minute').toDate(),
        attempts: 3,
        used: false,
      };

      otpRepo.find.mockResolvedValue([exhaustedOtp]);

      await expect(
        service.verifyOtp({
          phone: '+919876543210',
          code: rawCode,
          purpose: OtpPurpose.LOGIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── acceptInvite ────────────────────────────────────────────────────────────

  describe('acceptInvite()', () => {
    it('activates the user and clears the invite token on success', async () => {
      const inviteUser = {
        id: 'inv-user-1',
        inviteToken: 'valid-token',
        inviteExpiresAt: dayjs().add(1, 'day').toDate(),
        isActive: false,
        passwordHash: '',
      };

      userRepo.findOne.mockResolvedValue(inviteUser);
      userRepo.save.mockImplementation(async (u: any) => u);

      const result = await service.acceptInvite({
        inviteToken: 'valid-token',
        password: 'NewPass@9999',
      });

      expect(inviteUser.isActive).toBe(true);
      expect(inviteUser.inviteToken).toBeNull();
      expect(result).toEqual({
        message: 'Account activated. You can now log in.',
      });
    });

    it('throws UnauthorizedException when invite token is invalid', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.acceptInvite({
          inviteToken: 'bad-token',
          password: 'NewPass@9999',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws BadRequestException when invite token has expired', async () => {
      const expiredUser = {
        id: 'inv-user-2',
        inviteToken: 'expired-token',
        inviteExpiresAt: dayjs().subtract(1, 'hour').toDate(),
        isActive: false,
      };

      userRepo.findOne.mockResolvedValue(expiredUser);

      await expect(
        service.acceptInvite({
          inviteToken: 'expired-token',
          password: 'NewPass@9999',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── changePassword ──────────────────────────────────────────────────────────

  describe('changePassword()', () => {
    it('hashes the new password and revokes all refresh tokens', async () => {
      const hash = await bcrypt.hash('OldPass@1', 10);
      const user = { id: 'usr-1', passwordHash: hash };

      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockImplementation(async (u: any) => u);
      refreshRepo.update.mockResolvedValue({});

      const result = await service.changePassword('usr-1', {
        currentPassword: 'OldPass@1',
        newPassword: 'NewPass@2',
      });

      expect(refreshRepo.update).toHaveBeenCalledWith(
        { userId: 'usr-1', revoked: false },
        { revoked: true },
      );
      expect(result.message).toContain('Password changed');
    });

    it('throws BadRequestException when current password is wrong', async () => {
      const hash = await bcrypt.hash('CorrectPass@1', 10);
      userRepo.findOne.mockResolvedValue({ id: 'usr-1', passwordHash: hash });

      await expect(
        service.changePassword('usr-1', {
          currentPassword: 'WrongPass@1',
          newPassword: 'NewPass@2',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when new password equals current password', async () => {
      const hash = await bcrypt.hash('SamePass@1', 10);
      userRepo.findOne.mockResolvedValue({ id: 'usr-1', passwordHash: hash });

      await expect(
        service.changePassword('usr-1', {
          currentPassword: 'SamePass@1',
          newPassword: 'SamePass@1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws UnauthorizedException when user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword('ghost', {
          currentPassword: 'any',
          newPassword: 'other',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
