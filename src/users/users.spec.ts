import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Facility } from './entities/facility.entity';
import { FacilitySettings } from './entities/facility-settings.entity';
import { Role } from '../common/enums/role.enum';

// ─── Shared fixture factories ─────────────────────────────────────────────────

const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-uuid-1',
    facilityId: 'fac-uuid-1',
    email: 'doctor@hospital.com',
    phone: '+919876543210',
    passwordHash: '$2b$12$hashedpassword',
    firstName: 'Alice',
    lastName: 'Smith',
    role: Role.DOCTOR,
    isActive: true,
    lastLoginAt: null as any,
    inviteToken: null as any,
    inviteExpiresAt: null as any,
    profilePhoto: null as any,
    doctorProfile: null as any,
    nurseProfile: null as any,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
    ...overrides,
  }) as User;

const buildFacility = (overrides: Partial<Facility> = {}): Facility =>
  ({
    id: 'fac-uuid-1',
    name: 'City Hospital',
    isActive: true,
    approvalStatus: 'ACTIVE',
    ...overrides,
  }) as Facility;

const buildSettings = (
  overrides: Partial<FacilitySettings> = {},
): FacilitySettings =>
  ({
    id: 'settings-uuid-1',
    facilityId: 'fac-uuid-1',
    ...overrides,
  }) as FacilitySettings;

// ─── Repository mock factory ──────────────────────────────────────────────────

const makeRepoMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  softRemove: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: ReturnType<typeof makeRepoMock>;
  let facilityRepo: ReturnType<typeof makeRepoMock>;
  let settingsRepo: ReturnType<typeof makeRepoMock>;

  beforeEach(async () => {
    userRepo = makeRepoMock();
    facilityRepo = makeRepoMock();
    settingsRepo = makeRepoMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Facility), useValue: facilityRepo },
        {
          provide: getRepositoryToken(FacilitySettings),
          useValue: settingsRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createUser ─────────────────────────────────────────────────────────────

  describe('createUser()', () => {
    it('hashes the password and saves a new user', async () => {
      userRepo.findOne.mockResolvedValueOnce(null); // no duplicate
      const created = buildUser();
      userRepo.create.mockReturnValueOnce(created);
      userRepo.save.mockResolvedValueOnce(created);

      const result = await service.createUser(
        {
          email: 'doctor@hospital.com',
          password: 'P@ssw0rd!',
          firstName: 'Alice',
          lastName: 'Smith',
          role: Role.DOCTOR,
        },
        'fac-uuid-1',
      );

      expect(userRepo.create).toHaveBeenCalledTimes(1);
      expect(userRepo.save).toHaveBeenCalledTimes(1);
      // Raw password must NOT appear in the saved object
      const savedArg = userRepo.save.mock.calls[0][0] as User;
      expect((savedArg as any).password).toBeUndefined();
      // Result is sanitized — passwordHash and invite fields stripped
      const {
        passwordHash: _ph,
        inviteToken: _it,
        inviteExpiresAt: _ie,
        ...expectedSafe
      } = created as any;
      expect(result).toEqual(expectedSafe);
    });

    it('throws ConflictException when the email is already taken', async () => {
      userRepo.findOne.mockResolvedValueOnce(buildUser());

      await expect(
        service.createUser(
          {
            email: 'doctor@hospital.com',
            password: 'P@ssw0rd!',
            firstName: 'Alice',
            lastName: 'Smith',
            role: Role.DOCTOR,
          },
          'fac-uuid-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── findUserByEmail ─────────────────────────────────────────────────────────

  describe('findUserByEmail()', () => {
    it('returns a user when found by email', async () => {
      const user = buildUser();
      userRepo.findOne.mockResolvedValueOnce(user);

      const result = await service.findUserByEmail('doctor@hospital.com');

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'doctor@hospital.com' },
      });
      expect(result).toEqual(user);
    });

    it('returns null when no user matches the email', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.findUserByEmail('unknown@hospital.com');

      expect(result).toBeNull();
    });
  });

  // ─── findUserByIdOnly ────────────────────────────────────────────────────────

  describe('findUserByIdOnly()', () => {
    it('looks up a user by id only (no facilityId constraint)', async () => {
      const user = buildUser();
      userRepo.findOne.mockResolvedValueOnce(user);

      const result = await service.findUserByIdOnly('user-uuid-1');

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
      });
      expect(result).toEqual(user);
    });

    it('returns null when the user does not exist', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.findUserByIdOnly('ghost-id');

      expect(result).toBeNull();
    });
  });

  // ─── findUserById ────────────────────────────────────────────────────────────

  describe('findUserById()', () => {
    it('returns a user when found by id + facilityId', async () => {
      const user = buildUser();
      userRepo.findOne.mockResolvedValueOnce(user);

      const result = await service.findUserById('user-uuid-1', 'fac-uuid-1');

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1', facilityId: 'fac-uuid-1' },
      });
      // Result is sanitized — passwordHash and invite fields stripped
      const {
        passwordHash: _ph,
        inviteToken: _it,
        inviteExpiresAt: _ie,
        ...expectedSafe
      } = user as any;
      expect(result).toEqual(expectedSafe);
    });

    it('throws NotFoundException when the user is not found', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.findUserById('no-such-user', 'fac-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAllUsers ────────────────────────────────────────────────────────────

  describe('findAllUsers()', () => {
    it('returns all users for a facility', async () => {
      const users = [
        buildUser(),
        buildUser({
          id: 'user-uuid-2',
          email: 'nurse@h.com',
          role: Role.NURSE,
        }),
      ];
      userRepo.find.mockResolvedValueOnce(users);

      const result = await service.findAllUsers('fac-uuid-1');

      expect(userRepo.find).toHaveBeenCalledWith({
        where: { facilityId: 'fac-uuid-1' },
      });
      expect(result).toHaveLength(2);
    });
  });

  // ─── updateLastLogin ─────────────────────────────────────────────────────────

  describe('updateLastLogin()', () => {
    it('calls repo.update with a recent Date for lastLoginAt', async () => {
      userRepo.update.mockResolvedValueOnce({ affected: 1 });
      const before = new Date();

      await service.updateLastLogin('user-uuid-1');

      expect(userRepo.update).toHaveBeenCalledTimes(1);
      const [id, patch] = userRepo.update.mock.calls[0] as [
        string,
        { lastLoginAt: Date },
      ];
      expect(id).toBe('user-uuid-1');
      expect(patch.lastLoginAt).toBeInstanceOf(Date);
      expect(patch.lastLoginAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });
  });

  // ─── updateUser ──────────────────────────────────────────────────────────────

  describe('updateUser()', () => {
    it('merges the DTO into the existing user and saves it', async () => {
      const existing = buildUser();
      userRepo.findOne.mockResolvedValueOnce(existing);
      const updated = { ...existing, firstName: 'Bob' };
      userRepo.save.mockResolvedValueOnce(updated);

      const result = await service.updateUser(
        'user-uuid-1',
        { firstName: 'Bob' },
        'fac-uuid-1',
      );

      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(result.firstName).toBe('Bob');
    });

    it('throws NotFoundException when the user does not exist', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.updateUser('no-user', { firstName: 'X' }, 'fac-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── removeUser ──────────────────────────────────────────────────────────────

  describe('removeUser()', () => {
    it('soft-removes the user via softRemove()', async () => {
      const user = buildUser();
      // removeUser uses userRepo.findOne directly (not the sanitized findUserById)
      userRepo.findOne.mockResolvedValueOnce(user);
      userRepo.softRemove.mockResolvedValueOnce(user);

      await service.removeUser('user-uuid-1', 'fac-uuid-1');

      expect(userRepo.softRemove).toHaveBeenCalledWith(user);
    });
  });

  // ─── getDoctors ───────────────────────────────────────────────────────────────

  describe('getDoctors()', () => {
    it('queries only active DOCTOR-role users for the given facility', async () => {
      const doctors = [
        buildUser(),
        buildUser({ id: 'doc-2', email: 'doc2@h.com' }),
      ];
      userRepo.find.mockResolvedValueOnce(doctors);

      const result = await service.getDoctors('fac-uuid-1');

      expect(userRepo.find).toHaveBeenCalledWith({
        where: { facilityId: 'fac-uuid-1', role: Role.DOCTOR, isActive: true },
      });
      expect(result).toHaveLength(2);
    });
  });

  // ─── createFacility ──────────────────────────────────────────────────────────

  describe('createFacility()', () => {
    it('creates a facility and auto-creates its default settings', async () => {
      const facility = buildFacility();
      facilityRepo.create.mockReturnValueOnce(facility);
      facilityRepo.save.mockResolvedValueOnce(facility);

      const settingsStub = buildSettings();
      settingsRepo.create.mockReturnValueOnce(settingsStub);
      settingsRepo.save.mockResolvedValueOnce(settingsStub);

      const result = await service.createFacility({
        name: 'City Hospital',
        type: 'HOSPITAL' as any,
        city: 'Mumbai',
        state: 'Maharashtra',
        address: '1 MG Road',
        pincode: '400001',
        facilityPhone: '+9122222',
        adminEmail: 'admin@hospital.com',
      });

      expect(facilityRepo.save).toHaveBeenCalledTimes(1);
      expect(settingsRepo.create).toHaveBeenCalledWith({
        facilityId: facility.id,
      });
      expect(settingsRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual(facility);
    });
  });

  // ─── findFacilityById ────────────────────────────────────────────────────────

  describe('findFacilityById()', () => {
    it('returns the facility when found', async () => {
      const facility = buildFacility();
      facilityRepo.findOne.mockResolvedValueOnce(facility);

      const result = await service.findFacilityById('fac-uuid-1');

      expect(facilityRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'fac-uuid-1' },
      });
      expect(result).toEqual(facility);
    });

    it('throws NotFoundException when the facility does not exist', async () => {
      facilityRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.findFacilityById('ghost-fac')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── activateFacility ────────────────────────────────────────────────────────

  describe('activateFacility()', () => {
    it('sets isActive=true and approvalStatus=ACTIVE, then saves', async () => {
      const facility = buildFacility({
        isActive: false,
        approvalStatus: 'PENDING',
      });
      facilityRepo.findOne.mockResolvedValueOnce(facility);
      facilityRepo.save.mockResolvedValueOnce({
        ...facility,
        isActive: true,
        approvalStatus: 'ACTIVE',
      });

      const result = await service.activateFacility('fac-uuid-1');

      const savedArg = facilityRepo.save.mock.calls[0][0] as Facility;
      expect(savedArg.isActive).toBe(true);
      expect(savedArg.approvalStatus).toBe('ACTIVE');
      expect(result.isActive).toBe(true);
      expect(result.approvalStatus).toBe('ACTIVE');
    });

    it('throws NotFoundException when the facility does not exist', async () => {
      facilityRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.activateFacility('no-fac')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── suspendFacility ─────────────────────────────────────────────────────────

  describe('suspendFacility()', () => {
    it('sets isActive=false and approvalStatus=SUSPENDED, then saves', async () => {
      const facility = buildFacility({
        isActive: true,
        approvalStatus: 'ACTIVE',
      });
      facilityRepo.findOne.mockResolvedValueOnce(facility);
      facilityRepo.save.mockResolvedValueOnce({
        ...facility,
        isActive: false,
        approvalStatus: 'SUSPENDED',
      });

      const result = await service.suspendFacility('fac-uuid-1');

      const savedArg = facilityRepo.save.mock.calls[0][0] as Facility;
      expect(savedArg.isActive).toBe(false);
      expect(savedArg.approvalStatus).toBe('SUSPENDED');
      expect(result.isActive).toBe(false);
    });
  });

  // ─── getFacilitySettings ─────────────────────────────────────────────────────

  describe('getFacilitySettings()', () => {
    it('returns existing settings without creating a new record', async () => {
      const settings = buildSettings();
      settingsRepo.findOne.mockResolvedValueOnce(settings);

      const result = await service.getFacilitySettings('fac-uuid-1');

      expect(settingsRepo.create).not.toHaveBeenCalled();
      expect(result).toEqual(settings);
    });

    it('creates and saves default settings when none exist', async () => {
      settingsRepo.findOne.mockResolvedValueOnce(null);
      const newSettings = buildSettings();
      settingsRepo.create.mockReturnValueOnce(newSettings);
      settingsRepo.save.mockResolvedValueOnce(newSettings);

      const result = await service.getFacilitySettings('fac-uuid-1');

      expect(settingsRepo.create).toHaveBeenCalledWith({
        facilityId: 'fac-uuid-1',
      });
      expect(settingsRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual(newSettings);
    });
  });

  // ─── updateFacilitySettings ──────────────────────────────────────────────────

  describe('updateFacilitySettings()', () => {
    it('merges DTO fields into existing settings and saves', async () => {
      const settings = buildSettings({ enableSms: false } as any);
      settingsRepo.findOne.mockResolvedValueOnce(settings);
      const updatedSettings = { ...settings, enableSms: true };
      settingsRepo.save.mockResolvedValueOnce(updatedSettings);

      const result = await service.updateFacilitySettings('fac-uuid-1', {
        enableSms: true,
      } as any);

      expect(settingsRepo.save).toHaveBeenCalledTimes(1);
      expect(result.enableSms).toBe(true);
    });
  });

  // ─── uploadFacilityLogo ──────────────────────────────────────────────────────

  describe('uploadFacilityLogo()', () => {
    it('updates the logoUrl on the facility and saves', async () => {
      const facility = buildFacility({ logoUrl: null as any });
      facilityRepo.findOne.mockResolvedValueOnce(facility);
      const updated = {
        ...facility,
        logoUrl: 'https://cdn.example.com/logo.png',
      };
      facilityRepo.save.mockResolvedValueOnce(updated);

      const result = await service.uploadFacilityLogo(
        'fac-uuid-1',
        'https://cdn.example.com/logo.png',
      );

      const savedArg = facilityRepo.save.mock.calls[0][0] as Facility;
      expect(savedArg.logoUrl).toBe('https://cdn.example.com/logo.png');
      expect(result.logoUrl).toBe('https://cdn.example.com/logo.png');
    });
  });
});
