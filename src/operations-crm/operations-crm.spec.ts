import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OperationsCrmService } from './operations-crm.service';
import {
  StaffRoster,
  ShiftType,
  ShiftStatus,
} from './entities/staff-roster.entity';
import {
  InsurancePreAuth,
  PreAuthStatus,
} from './entities/insurance-pre-auth.entity';
import { ConsumableItem } from './entities/consumable-item.entity';
import { WardInventory } from './entities/ward-inventory.entity';
import { ConsumableConsumption } from './entities/consumable-consumption.entity';

const makeQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
  getOne: jest.fn().mockResolvedValue(null),
  getCount: jest.fn().mockResolvedValue(0),
});

const mockShiftRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQueryBuilder()),
};

const mockPreAuthRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQueryBuilder()),
};

const mockConsumableRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
};

const mockInventoryRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
};

const mockConsumptionRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const FACILITY_ID = 'facility-uuid-001';
const USER_ID = 'user-uuid-001';

describe('OperationsCrmService', () => {
  let service: OperationsCrmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationsCrmService,
        { provide: getRepositoryToken(StaffRoster), useValue: mockShiftRepo },
        {
          provide: getRepositoryToken(InsurancePreAuth),
          useValue: mockPreAuthRepo,
        },
        {
          provide: getRepositoryToken(ConsumableItem),
          useValue: mockConsumableRepo,
        },
        {
          provide: getRepositoryToken(WardInventory),
          useValue: mockInventoryRepo,
        },
        {
          provide: getRepositoryToken(ConsumableConsumption),
          useValue: mockConsumptionRepo,
        },
      ],
    }).compile();

    service = module.get<OperationsCrmService>(OperationsCrmService);
    jest.clearAllMocks();
  });

  // ─── createShift (staff roster) ───────────────────────────────────────────

  describe('createShift', () => {
    it('creates and saves a staff roster entry with facilityId', async () => {
      const dto = {
        staffId: 'nurse-1',
        staffRole: 'Nurse',
        wardId: 'ward-1',
        shiftDate: '2026-04-01',
        shiftType: ShiftType.MORNING,
        startAt: '08:00',
        endAt: '16:00',
      };
      const saved = { id: 'shift-1', ...dto, facilityId: FACILITY_ID };

      mockShiftRepo.create.mockReturnValue(saved);
      mockShiftRepo.save.mockResolvedValue(saved);

      const result = await service.createShift(dto as any, FACILITY_ID);

      expect(mockShiftRepo.create).toHaveBeenCalledWith({
        ...dto,
        facilityId: FACILITY_ID,
      });
      expect(result.facilityId).toBe(FACILITY_ID);
    });
  });

  // ─── findShifts (get staff roster by date) ────────────────────────────────

  describe('findShifts', () => {
    it('filters by date when provided', async () => {
      const qb = makeQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockShiftRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findShifts(FACILITY_ID, { date: '2026-04-01' });

      expect(qb.andWhere).toHaveBeenCalledWith('s.shiftDate = :date', {
        date: '2026-04-01',
      });
    });

    it('filters by wardId and shiftType when provided', async () => {
      const shifts = [{ id: 's1', wardId: 'ward-2' }];
      const qb = makeQueryBuilder();
      qb.getMany.mockResolvedValue(shifts);
      mockShiftRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findShifts(FACILITY_ID, {
        wardId: 'ward-2',
        shiftType: ShiftType.DAY,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('s.wardId = :wardId', {
        wardId: 'ward-2',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('s.shiftType = :shiftType', {
        shiftType: ShiftType.DAY,
      });
      expect(result).toHaveLength(1);
    });

    it('returns all shifts when no filters provided', async () => {
      const shifts = [{ id: 's1' }, { id: 's2' }];
      const qb = makeQueryBuilder();
      qb.getMany.mockResolvedValue(shifts);
      mockShiftRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findShifts(FACILITY_ID, {});

      expect(result).toHaveLength(2);
    });
  });

  // ─── createPreAuth (insurance pre-auth) ──────────────────────────────────

  describe('createPreAuth', () => {
    it('creates a pre-auth record with requestedById set', async () => {
      const dto = {
        patientId: 'patient-1',
        admissionId: 'adm-1',
        insurancePayer: 'Star Health',
        estimatedAmount: 50000,
      };
      const saved = {
        id: 'pa-1',
        ...dto,
        facilityId: FACILITY_ID,
        requestedById: USER_ID,
      };

      mockPreAuthRepo.create.mockReturnValue(saved);
      mockPreAuthRepo.save.mockResolvedValue(saved);

      const result = await service.createPreAuth(
        dto as any,
        FACILITY_ID,
        USER_ID,
      );

      expect(mockPreAuthRepo.create).toHaveBeenCalledWith({
        ...dto,
        facilityId: FACILITY_ID,
        requestedById: USER_ID,
      });
      expect(result.requestedById).toBe(USER_ID);
    });
  });

  // ─── getConsumableItems ───────────────────────────────────────────────────

  describe('getConsumableItems', () => {
    it('returns active consumable items sorted by name', async () => {
      const items = [
        { id: 'c1', itemName: 'Bandage', isActive: true },
        { id: 'c2', itemName: 'Gloves', isActive: true },
      ];
      mockConsumableRepo.find.mockResolvedValue(items);

      const result = await service.getConsumableItems(FACILITY_ID);

      expect(mockConsumableRepo.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          facilityId: FACILITY_ID,
          isActive: true,
        }),
        order: { itemName: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no consumables exist', async () => {
      mockConsumableRepo.find.mockResolvedValue([]);

      const result = await service.getConsumableItems(FACILITY_ID);

      expect(result).toHaveLength(0);
    });
  });

  // ─── recordConsumption ────────────────────────────────────────────────────

  describe('recordConsumption', () => {
    const consumeDto = {
      wardId: 'ward-1',
      consumableItemId: 'item-1',
      quantity: 5,
      patientId: 'patient-1',
      admissionId: 'adm-1',
      usedById: USER_ID,
    };

    it('throws NotFoundException when ward inventory does not exist', async () => {
      mockInventoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.recordConsumption(consumeDto as any, FACILITY_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when stock is insufficient', async () => {
      const inv = { id: 'inv-1', currentStock: 3 };
      mockInventoryRepo.findOne.mockResolvedValue(inv);

      await expect(
        service.recordConsumption(consumeDto as any, FACILITY_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('deducts stock and creates a consumption record', async () => {
      const inv = { id: 'inv-1', currentStock: 10 };
      const consumption = {
        id: 'con-1',
        ...consumeDto,
        facilityId: FACILITY_ID,
      };

      mockInventoryRepo.findOne.mockResolvedValue(inv);
      mockInventoryRepo.save.mockResolvedValue({ ...inv, currentStock: 5 });
      mockConsumptionRepo.create.mockReturnValue(consumption);
      mockConsumptionRepo.save.mockResolvedValue(consumption);

      const result = await service.recordConsumption(
        consumeDto as any,
        FACILITY_ID,
      );

      expect(mockInventoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ currentStock: 5 }),
      );
      expect(mockConsumptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId: FACILITY_ID }),
      );
      expect(result.id).toBe('con-1');
    });
  });

  // ─── updatePreAuth ────────────────────────────────────────────────────────

  describe('updatePreAuth', () => {
    it('throws NotFoundException when pre-auth record does not exist', async () => {
      mockPreAuthRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updatePreAuth(
          'no-id',
          { status: PreAuthStatus.APPROVED } as any,
          FACILITY_ID,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('sets respondedAt when status is APPROVED', async () => {
      const pa = {
        id: 'pa-1',
        status: PreAuthStatus.PENDING,
        respondedAt: null,
        submittedAt: null,
      };
      const saved = {
        ...pa,
        status: PreAuthStatus.APPROVED,
        respondedAt: new Date(),
      };

      mockPreAuthRepo.findOne.mockResolvedValue(pa);
      mockPreAuthRepo.save.mockResolvedValue(saved);

      const result = await service.updatePreAuth(
        'pa-1',
        { status: PreAuthStatus.APPROVED } as any,
        FACILITY_ID,
      );

      expect(result.respondedAt).toBeDefined();
    });

    it('sets submittedAt when status transitions to SUBMITTED', async () => {
      const pa = {
        id: 'pa-1',
        status: PreAuthStatus.PENDING,
        submittedAt: null,
        respondedAt: null,
      };
      const saved = {
        ...pa,
        status: PreAuthStatus.SUBMITTED,
        submittedAt: new Date(),
      };

      mockPreAuthRepo.findOne.mockResolvedValue(pa);
      mockPreAuthRepo.save.mockResolvedValue(saved);

      const result = await service.updatePreAuth(
        'pa-1',
        { status: PreAuthStatus.SUBMITTED } as any,
        FACILITY_ID,
      );

      expect(result.submittedAt).toBeDefined();
    });
  });

  // ─── swapShift ────────────────────────────────────────────────────────────

  describe('swapShift', () => {
    it('throws NotFoundException when shift does not exist', async () => {
      mockShiftRepo.findOne.mockResolvedValue(null);

      await expect(
        service.swapShift('no-shift', 'nurse-2', FACILITY_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('marks shift as SWAPPED and records swappedWithStaffId', async () => {
      const shift = { id: 'shift-1', status: ShiftStatus.SCHEDULED };
      const saved = {
        ...shift,
        status: ShiftStatus.SWAPPED,
        swappedWithStaffId: 'nurse-2',
      };

      mockShiftRepo.findOne.mockResolvedValue(shift);
      mockShiftRepo.save.mockResolvedValue(saved);

      const result = await service.swapShift('shift-1', 'nurse-2', FACILITY_ID);

      expect(result.status).toBe(ShiftStatus.SWAPPED);
      expect(result.swappedWithStaffId).toBe('nurse-2');
    });
  });
});
