import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { Equipment, EquipmentStatus } from './entities/equipment.entity';
import {
  EquipmentLease,
  PatientLeaseStatus,
} from './entities/equipment-lease.entity';
import { MaintenanceLog } from './entities/maintenance-log.entity';

const makeQb = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getManyAndCount: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
  select: jest.fn().mockReturnThis(),
});

const mockEquipmentRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockLeaseRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockMaintenanceRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

describe('EquipmentService', () => {
  let service: EquipmentService;

  const facilityId = 'fac-test';
  const userId = 'user-test';

  beforeEach(async () => {
    jest.clearAllMocks();

    mockEquipmentRepo.createQueryBuilder.mockReturnValue(makeQb());
    mockLeaseRepo.createQueryBuilder.mockReturnValue(makeQb());
    mockMaintenanceRepo.createQueryBuilder.mockReturnValue(makeQb());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentService,
        { provide: getRepositoryToken(Equipment), useValue: mockEquipmentRepo },
        { provide: getRepositoryToken(EquipmentLease), useValue: mockLeaseRepo },
        { provide: getRepositoryToken(MaintenanceLog), useValue: mockMaintenanceRepo },
      ],
    }).compile();

    service = module.get<EquipmentService>(EquipmentService);
  });

  // ─── create() ─────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates and saves equipment with facilityId', async () => {
      const dto = { name: 'Ventilator', category: 'ICU', serialNumber: 'SN001' };
      const saved = { id: 'eq-1', ...dto, facilityId };
      mockEquipmentRepo.create.mockReturnValue(saved);
      mockEquipmentRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto as any, facilityId);

      expect(mockEquipmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId }),
      );
      expect(mockEquipmentRepo.save).toHaveBeenCalledWith(saved);
      expect(result).toBe(saved);
    });

    it('converts purchaseDate string to Date object', async () => {
      const dto = { name: 'ECG Machine', purchaseDate: '2024-01-15' };
      mockEquipmentRepo.create.mockImplementation((data) => data);
      mockEquipmentRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.create(dto as any, facilityId);

      const callArg = mockEquipmentRepo.create.mock.calls[0][0];
      expect(callArg.purchaseDate).toBeInstanceOf(Date);
    });

    it('converts warrantyExpiresAt string to Date object', async () => {
      const dto = { name: 'Defibrillator', warrantyExpiresAt: '2027-12-31' };
      mockEquipmentRepo.create.mockImplementation((data) => data);
      mockEquipmentRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.create(dto as any, facilityId);

      const callArg = mockEquipmentRepo.create.mock.calls[0][0];
      expect(callArg.warrantyExpiresAt).toBeInstanceOf(Date);
    });
  });

  // ─── findAll() ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns all equipment for a facility', async () => {
      const qb = makeQb();
      const items = [{ id: 'eq-1' }, { id: 'eq-2' }];
      qb.getMany.mockResolvedValue(items);
      mockEquipmentRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(facilityId);

      expect(result).toEqual(items);
    });

    it('applies status filter when provided', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([]);
      mockEquipmentRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(facilityId, { status: EquipmentStatus.AVAILABLE });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        { status: EquipmentStatus.AVAILABLE },
      );
    });

    it('applies category filter when provided', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([]);
      mockEquipmentRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(facilityId, { category: 'Diagnostics' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('category'),
        { category: 'Diagnostics' },
      );
    });

    it('does not apply filters when none are provided', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([]);
      mockEquipmentRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(facilityId);

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  // ─── findOne() ─────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns equipment when found', async () => {
      const eq = { id: 'eq-1', facilityId };
      mockEquipmentRepo.findOne.mockResolvedValue(eq);

      const result = await service.findOne('eq-1', facilityId);

      expect(result).toBe(eq);
    });

    it('throws NotFoundException when equipment not found', async () => {
      mockEquipmentRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('no-eq', facilityId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── issueToPatient() (createLease) ────────────────────────────────────────

  describe('issueToPatient()', () => {
    it('creates a lease and updates equipment status to LEASED_OUT', async () => {
      const eq = { id: 'eq-1', status: EquipmentStatus.AVAILABLE, facilityId };
      mockEquipmentRepo.findOne.mockResolvedValue(eq);
      mockEquipmentRepo.save.mockResolvedValue({ ...eq, status: EquipmentStatus.LEASED_OUT });

      const lease = { id: 'lease-1' };
      mockLeaseRepo.create.mockReturnValue(lease);
      mockLeaseRepo.save.mockResolvedValue(lease);

      const dto = { equipmentId: 'eq-1', patientId: 'p1', dueDate: '2026-04-30' };
      const result = await service.issueToPatient(dto as any, facilityId, userId);

      expect(mockEquipmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: EquipmentStatus.LEASED_OUT }),
      );
      expect(mockLeaseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId, issuedById: userId }),
      );
      expect(result).toBe(lease);
    });

    it('throws NotFoundException when equipment does not exist', async () => {
      mockEquipmentRepo.findOne.mockResolvedValue(null);

      const dto = { equipmentId: 'ghost', patientId: 'p1', dueDate: '2026-04-30' };
      await expect(service.issueToPatient(dto as any, facilityId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── createMaintenanceLog() ────────────────────────────────────────────────

  describe('createMaintenanceLog()', () => {
    it('creates and saves a maintenance log with facilityId', async () => {
      const dto = {
        equipmentId: 'eq-1',
        scheduledDate: '2026-04-15',
        type: 'PREVENTIVE',
      };
      const log = { id: 'log-1', ...dto, facilityId };
      mockMaintenanceRepo.create.mockReturnValue(log);
      mockMaintenanceRepo.save.mockResolvedValue(log);

      const result = await service.createMaintenanceLog(dto as any, facilityId);

      expect(mockMaintenanceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId,
          scheduledDate: expect.any(Date),
        }),
      );
      expect(result).toBe(log);
    });

    it('converts performedDate string to Date when provided', async () => {
      const dto = {
        equipmentId: 'eq-1',
        scheduledDate: '2026-04-10',
        performedDate: '2026-04-11',
      };
      mockMaintenanceRepo.create.mockImplementation((data) => data);
      mockMaintenanceRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.createMaintenanceLog(dto as any, facilityId);

      const callArg = mockMaintenanceRepo.create.mock.calls[0][0];
      expect(callArg.performedDate).toBeInstanceOf(Date);
    });

    it('leaves performedDate undefined when not provided', async () => {
      const dto = { equipmentId: 'eq-1', scheduledDate: '2026-04-10' };
      mockMaintenanceRepo.create.mockImplementation((data) => data);
      mockMaintenanceRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.createMaintenanceLog(dto as any, facilityId);

      const callArg = mockMaintenanceRepo.create.mock.calls[0][0];
      expect(callArg.performedDate).toBeUndefined();
    });
  });

  // ─── returnFromPatient() ───────────────────────────────────────────────────

  describe('returnFromPatient()', () => {
    it('updates lease to RETURNED and equipment to AVAILABLE', async () => {
      const lease = {
        id: 'lease-1',
        facilityId,
        equipmentId: 'eq-1',
        status: PatientLeaseStatus.ACTIVE,
      };
      mockLeaseRepo.findOne.mockResolvedValue(lease);

      const eq = { id: 'eq-1', status: EquipmentStatus.LEASED_OUT };
      mockEquipmentRepo.findOne.mockResolvedValue(eq);
      mockEquipmentRepo.save.mockResolvedValue({ ...eq, status: EquipmentStatus.AVAILABLE });
      mockLeaseRepo.save.mockResolvedValue({ ...lease, status: PatientLeaseStatus.RETURNED });

      const dto = { returnedCondition: 'GOOD' };
      const result = await service.returnFromPatient('lease-1', dto as any, facilityId);

      expect(mockEquipmentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: EquipmentStatus.AVAILABLE }),
      );
      expect(lease.status).toBe(PatientLeaseStatus.RETURNED);
    });

    it('throws NotFoundException when lease is not found', async () => {
      mockLeaseRepo.findOne.mockResolvedValue(null);

      await expect(
        service.returnFromPatient('ghost-lease', { returnedCondition: 'GOOD' } as any, facilityId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
