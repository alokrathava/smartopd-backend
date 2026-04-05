import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { PharmacyService } from './pharmacy.service';
import { DispenseRecord } from './entities/dispense-record.entity';
import { PharmacyInventory } from './entities/pharmacy-inventory.entity';
import { Patient } from '../patients/entities/patient.entity';

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

const mockDispenseRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockInventoryRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockPatientRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockHttpService = {
  get: jest.fn().mockReturnValue(of({ data: {} })),
  post: jest.fn().mockReturnValue(of({ data: {} })),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue(''),
};

describe('PharmacyService', () => {
  let service: PharmacyService;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Provide fresh query builder instance for each test
    mockDispenseRepo.createQueryBuilder.mockReturnValue(makeQb());
    mockInventoryRepo.createQueryBuilder.mockReturnValue(makeQb());
    mockPatientRepo.createQueryBuilder.mockReturnValue(makeQb());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PharmacyService,
        {
          provide: getRepositoryToken(DispenseRecord),
          useValue: mockDispenseRepo,
        },
        {
          provide: getRepositoryToken(PharmacyInventory),
          useValue: mockInventoryRepo,
        },
        { provide: getRepositoryToken(Patient), useValue: mockPatientRepo },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PharmacyService>(PharmacyService);
  });

  // ─── dispense() ────────────────────────────────────────────────────────────

  describe('dispense()', () => {
    it('calculates totalPrice as unitPrice × quantityDispensed', async () => {
      const dto = {
        patientId: 'p1',
        drugName: 'Paracetamol',
        unitPrice: 10,
        quantityDispensed: 5,
        otpVerified: false,
      };
      const expected = { id: 'dr1', totalPrice: 50 };
      mockDispenseRepo.create.mockReturnValue(expected);
      mockDispenseRepo.save.mockResolvedValue(expected);

      const result = await service.dispense(dto as any, 'fac1', 'pharm1');

      expect(mockDispenseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalPrice: 50 }),
      );
      expect(result.totalPrice).toBe(50);
    });

    it('sets totalPrice to undefined when unitPrice is missing', async () => {
      const dto = {
        patientId: 'p1',
        drugName: 'Amoxicillin',
        quantityDispensed: 2,
      };
      const created = { id: 'dr2', totalPrice: undefined };
      mockDispenseRepo.create.mockReturnValue(created);
      mockDispenseRepo.save.mockResolvedValue(created);

      const result = await service.dispense(dto as any, 'fac1', 'pharm1');

      expect(mockDispenseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ totalPrice: undefined }),
      );
      expect(result.totalPrice).toBeUndefined();
    });

    it('passes facilityId and pharmacistId to the created record', async () => {
      const dto = {
        patientId: 'p1',
        drugName: 'Ibuprofen',
        unitPrice: 5,
        quantityDispensed: 10,
      };
      mockDispenseRepo.create.mockReturnValue({});
      mockDispenseRepo.save.mockResolvedValue({ id: 'dr3' });

      await service.dispense(dto as any, 'fac-test', 'pharm-test');

      expect(mockDispenseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: 'fac-test',
          dispensedById: 'pharm-test',
        }),
      );
    });

    it('sets otpVerifiedAt when otpVerified is true', async () => {
      const dto = {
        patientId: 'p1',
        drugName: 'Drug',
        unitPrice: 1,
        quantityDispensed: 1,
        otpVerified: true,
      };
      mockDispenseRepo.create.mockImplementation((data) => data);
      mockDispenseRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.dispense(dto as any, 'fac1', 'ph1');

      const callArg = mockDispenseRepo.create.mock.calls[0][0];
      expect(callArg.otpVerifiedAt).toBeInstanceOf(Date);
    });

    it('saves the record and returns the saved entity', async () => {
      const dto = {
        patientId: 'p1',
        drugName: 'Drug',
        unitPrice: 2,
        quantityDispensed: 3,
      };
      const saved = { id: 'dr-saved', totalPrice: 6 };
      mockDispenseRepo.create.mockReturnValue({});
      mockDispenseRepo.save.mockResolvedValue(saved);

      const result = await service.dispense(dto as any, 'fac1', 'ph1');

      expect(mockDispenseRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(saved);
    });
  });

  // ─── checkAllergy() ────────────────────────────────────────────────────────

  describe('checkAllergy()', () => {
    it('throws NotFoundException when patient is not found', async () => {
      mockPatientRepo.findOne.mockResolvedValue(null);

      await expect(
        service.checkAllergy('p-missing', 'Penicillin', 'fac1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns hasAllergy=false when patient has no allergies', async () => {
      mockPatientRepo.findOne.mockResolvedValue({ id: 'p1', allergies: null });

      const result = await service.checkAllergy('p1', 'Aspirin', 'fac1');

      expect(result.hasAllergy).toBe(false);
    });

    it('detects allergy from comma-separated list', async () => {
      mockPatientRepo.findOne.mockResolvedValue({
        id: 'p1',
        allergies: 'penicillin, aspirin, sulfa',
      });

      const result = await service.checkAllergy('p1', 'Penicillin', 'fac1');

      expect(result.hasAllergy).toBe(true);
      expect(result.matchedAllergens).toContain('penicillin');
      expect(result.warning).toMatch(/ALLERGY ALERT/i);
    });

    it('detects allergy from JSON array', async () => {
      mockPatientRepo.findOne.mockResolvedValue({
        id: 'p1',
        allergies: JSON.stringify(['penicillin', 'ibuprofen']),
      });

      const result = await service.checkAllergy(
        'p1',
        'ibuprofen 400mg',
        'fac1',
      );

      expect(result.hasAllergy).toBe(true);
      expect(result.matchedAllergens).toContain('ibuprofen');
    });

    it('returns no allergy when drug does not match any allergen', async () => {
      mockPatientRepo.findOne.mockResolvedValue({
        id: 'p1',
        allergies: 'penicillin, sulfa',
      });

      const result = await service.checkAllergy('p1', 'Paracetamol', 'fac1');

      expect(result.hasAllergy).toBe(false);
      expect(result.matchedAllergens).toHaveLength(0);
      expect(result.warning).toBeUndefined();
    });
  });

  // ─── getLowStock() ─────────────────────────────────────────────────────────

  describe('getLowStock()', () => {
    it('returns items where quantityInStock <= reorderLevel', async () => {
      const qb = makeQb();
      const lowItems = [
        { id: 'inv1', drugName: 'DrugA', quantityInStock: 5, reorderLevel: 10 },
      ];
      qb.getMany.mockResolvedValue(lowItems);
      mockInventoryRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getLowStock('fac1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('quantityInStock <= i.reorderLevel'),
      );
      expect(result).toEqual(lowItems);
    });

    it('filters by facilityId', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([]);
      mockInventoryRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getLowStock('fac-xyz');

      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('facilityId'),
        { facilityId: 'fac-xyz' },
      );
    });

    it('only returns active items', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([]);
      mockInventoryRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getLowStock('fac1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('isActive = true'),
      );
    });
  });

  // ─── getExpiringStock() ────────────────────────────────────────────────────

  describe('getExpiringStock()', () => {
    it('calls find with expiryDate LessThanOrEqual threshold', async () => {
      mockInventoryRepo.find.mockResolvedValue([]);

      await service.getExpiringStock('fac1', 30);

      expect(mockInventoryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ facilityId: 'fac1' }),
        }),
      );
    });

    it('uses default of 30 days when days param is omitted', async () => {
      mockInventoryRepo.find.mockResolvedValue([]);

      await service.getExpiringStock('fac1');

      expect(mockInventoryRepo.find).toHaveBeenCalledTimes(1);
    });

    it('returns items sorted by expiryDate ASC', async () => {
      const items = [{ id: 'inv1', expiryDate: new Date('2026-04-01') }];
      mockInventoryRepo.find.mockResolvedValue(items);

      const result = await service.getExpiringStock('fac1', 90);

      expect(mockInventoryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { expiryDate: 'ASC' } }),
      );
      expect(result).toEqual(items);
    });
  });

  // ─── getDispenseHistory() ──────────────────────────────────────────────────

  describe('getDispenseHistory()', () => {
    it('returns all history for a facility when no filters provided', async () => {
      const qb = makeQb();
      const records = [{ id: 'dr1' }, { id: 'dr2' }];
      qb.getMany.mockResolvedValue(records);
      mockDispenseRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getDispenseHistory('fac1');

      expect(result).toEqual(records);
      expect(qb.andWhere).not.toHaveBeenCalled();
    });

    it('filters by patientId when provided', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([]);
      mockDispenseRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getDispenseHistory('fac1', { patientId: 'pat-abc' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('patientId'),
        { patientId: 'pat-abc' },
      );
    });

    it('filters by prescriptionId when provided', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([]);
      mockDispenseRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getDispenseHistory('fac1', { prescriptionId: 'rx-001' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('prescriptionId'),
        { prescriptionId: 'rx-001' },
      );
    });

    it('applies both patientId and prescriptionId filters simultaneously', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([]);
      mockDispenseRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getDispenseHistory('fac1', {
        patientId: 'p1',
        prescriptionId: 'rx1',
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(2);
    });
  });
});
