import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';

import { NurseService } from './nurse.service';
import { Vitals } from './entities/vitals.entity';
import { Triage } from './entities/triage.entity';
import { Mar, MarStatus } from './entities/mar.entity';
import { Visit } from '../visits/entities/visit.entity';

// ── Mock factory ───────────────────────────────────────────────────────────────

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

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('NurseService', () => {
  let service: NurseService;
  let vitalsRepo: ReturnType<typeof makeRepo>;
  let triageRepo: ReturnType<typeof makeRepo>;
  let marRepo: ReturnType<typeof makeRepo>;
  let visitRepo: ReturnType<typeof makeRepo>;

  const facilityId = 'facility-001';
  const userId = 'nurse-001';
  const visitId = 'visit-001';

  beforeEach(async () => {
    vitalsRepo = makeRepo();
    triageRepo = makeRepo();
    marRepo = makeRepo();
    visitRepo = makeRepo();

    // Default: visit exists
    visitRepo.findOne.mockResolvedValue({ id: visitId, facilityId });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NurseService,
        { provide: getRepositoryToken(Vitals), useValue: vitalsRepo },
        { provide: getRepositoryToken(Triage), useValue: triageRepo },
        { provide: getRepositoryToken(Mar), useValue: marRepo },
        { provide: getRepositoryToken(Visit), useValue: visitRepo },
      ],
    }).compile();

    service = module.get<NurseService>(NurseService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── recordVitals ───────────────────────────────────────────────────────────

  describe('recordVitals()', () => {
    it('computes BMI from weight and height', async () => {
      vitalsRepo.create.mockImplementation((data: any) => data);
      vitalsRepo.save.mockImplementation(async (v: any) => v);

      const dto: any = {
        visitId,
        patientId: 'p-1',
        weight: 70,
        height: 175,
      };

      await service.recordVitals(dto, facilityId, userId);

      const created = vitalsRepo.create.mock.calls[0][0];
      // BMI = 70 / (1.75 * 1.75) ≈ 22.86
      expect(created.bmi).toBeCloseTo(22.86, 1);
    });

    it('sets isCritical and criticalFlags when SpO2 is below 94', async () => {
      vitalsRepo.create.mockImplementation((data: any) => data);
      vitalsRepo.save.mockImplementation(async (v: any) => v);

      const dto: any = { visitId, patientId: 'p-1', spO2: 90 };

      await service.recordVitals(dto, facilityId, userId);

      const created = vitalsRepo.create.mock.calls[0][0];
      expect(created.isCritical).toBe(true);
      expect(created.criticalFlags).toContain('SpO2 low');
    });

    it('sets isCritical when systolic BP is above 180', async () => {
      vitalsRepo.create.mockImplementation((data: any) => data);
      vitalsRepo.save.mockImplementation(async (v: any) => v);

      const dto: any = { visitId, patientId: 'p-1', systolic: 190 };

      await service.recordVitals(dto, facilityId, userId);

      const created = vitalsRepo.create.mock.calls[0][0];
      expect(created.isCritical).toBe(true);
      expect(created.criticalFlags).toContain('SBP high');
    });

    it('sets isCritical when temperature is above 39 C', async () => {
      vitalsRepo.create.mockImplementation((data: any) => data);
      vitalsRepo.save.mockImplementation(async (v: any) => v);

      const dto: any = { visitId, patientId: 'p-1', temperature: 40.1 };

      await service.recordVitals(dto, facilityId, userId);

      const created = vitalsRepo.create.mock.calls[0][0];
      expect(created.isCritical).toBe(true);
      expect(created.criticalFlags).toContain('Temp high');
    });

    it('does NOT set isCritical when all vitals are within normal range', async () => {
      vitalsRepo.create.mockImplementation((data: any) => data);
      vitalsRepo.save.mockImplementation(async (v: any) => v);

      const dto: any = {
        visitId,
        patientId: 'p-1',
        spO2: 98,
        systolic: 120,
        temperature: 37.0,
        pulse: 75,
      };

      await service.recordVitals(dto, facilityId, userId);

      const created = vitalsRepo.create.mock.calls[0][0];
      expect(created.isCritical).toBe(false);
      expect(created.criticalFlags).toBeUndefined();
    });

    it('sets isCritical when pulse rate is below 50', async () => {
      vitalsRepo.create.mockImplementation((data: any) => data);
      vitalsRepo.save.mockImplementation(async (v: any) => v);

      const dto: any = { visitId, patientId: 'p-1', pulse: 45 };

      await service.recordVitals(dto, facilityId, userId);

      const created = vitalsRepo.create.mock.calls[0][0];
      expect(created.isCritical).toBe(true);
      expect(created.criticalFlags).toContain('Pulse low');
    });

    it('omits BMI when weight or height is missing', async () => {
      vitalsRepo.create.mockImplementation((data: any) => data);
      vitalsRepo.save.mockImplementation(async (v: any) => v);

      const dto: any = { visitId, patientId: 'p-1', weight: 70 }; // no height

      await service.recordVitals(dto, facilityId, userId);

      const created = vitalsRepo.create.mock.calls[0][0];
      expect(created.bmi).toBeUndefined();
    });
  });

  // ── getVitals ──────────────────────────────────────────────────────────────

  describe('getVitals()', () => {
    it('returns vitals for a visit ordered by recordedAt DESC', async () => {
      const v1 = { id: 'v1', recordedAt: new Date('2026-03-31T10:00:00') };
      const v2 = { id: 'v2', recordedAt: new Date('2026-03-31T09:00:00') };
      vitalsRepo.find.mockResolvedValue([v1, v2]);

      const result = await service.getVitals(visitId, facilityId);

      expect(vitalsRepo.find).toHaveBeenCalledWith({
        where: { visitId, facilityId },
        order: { recordedAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });

    it('returns an empty array when no vitals exist', async () => {
      vitalsRepo.find.mockResolvedValue([]);

      const result = await service.getVitals(visitId, facilityId);

      expect(result).toEqual([]);
    });
  });

  // ── createTriage ───────────────────────────────────────────────────────────

  describe('createTriage()', () => {
    it('saves triage with triageById and triageAt set', async () => {
      const triage = { id: 'triage-1', visitId };
      triageRepo.create.mockReturnValue(triage);
      triageRepo.save.mockResolvedValue(triage);

      const dto: any = {
        visitId,
        patientId: 'p-1',
        chiefComplaint: 'Fever and cough',
        priorityLevel: 3,
      };

      const result = await service.createTriage(dto, facilityId, userId);

      expect(triageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId, triageById: userId }),
      );
      const created = triageRepo.create.mock.calls[0][0];
      expect(created.triageAt).toBeInstanceOf(Date);
      expect(result).toEqual(triage);
    });
  });

  // ── getTriage ──────────────────────────────────────────────────────────────

  describe('getTriage()', () => {
    it('returns the triage when found', async () => {
      const triage = { id: 'triage-1', visitId };
      triageRepo.findOne.mockResolvedValue(triage);

      const result = await service.getTriage(visitId, facilityId);

      expect(triageRepo.findOne).toHaveBeenCalledWith({
        where: { visitId, facilityId },
      });
      expect(result).toEqual(triage);
    });

    it('throws NotFoundException when triage does not exist', async () => {
      triageRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getTriage('ghost-visit', facilityId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── createMar ─────────────────────────────────────────────────────────────

  describe('createMar()', () => {
    it('saves MAR record with administeredById and scheduledAt', async () => {
      const marRecord = { id: 'mar-1', visitId };
      marRepo.create.mockReturnValue(marRecord);
      marRepo.save.mockResolvedValue(marRecord);

      const dto: any = {
        visitId,
        patientId: 'p-1',
        drugName: 'Paracetamol',
        dose: '500mg',
        route: 'Oral',
        scheduledAt: '2026-03-31T12:00:00.000Z',
      };

      const result = await service.createMar(dto, facilityId, userId);

      expect(marRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId, administeredById: userId }),
      );
      const created = marRepo.create.mock.calls[0][0];
      expect(created.scheduledAt).toBeInstanceOf(Date);
      expect(result).toEqual(marRecord);
    });
  });

  // ── updateMarStatus ────────────────────────────────────────────────────────

  describe('updateMarStatus()', () => {
    it('sets administeredAt when status changes to ADMINISTERED', async () => {
      const mar: Partial<Mar> = {
        id: 'mar-1',
        facilityId,
        status: MarStatus.SCHEDULED,
        administeredAt: undefined as any,
      };
      marRepo.findOne.mockResolvedValue(mar);
      marRepo.save.mockImplementation(async (m: any) => m);

      const before = new Date();
      await service.updateMarStatus(
        'mar-1',
        MarStatus.ADMINISTERED,
        facilityId,
      );
      const after = new Date();

      expect(mar.status).toBe(MarStatus.ADMINISTERED);
      expect(mar.administeredAt).toBeInstanceOf(Date);
      expect(mar.administeredAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(mar.administeredAt!.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    it('does NOT set administeredAt for non-ADMINISTERED statuses', async () => {
      const mar: Partial<Mar> = {
        id: 'mar-2',
        facilityId,
        status: MarStatus.SCHEDULED,
        administeredAt: undefined as any,
      };
      marRepo.findOne.mockResolvedValue(mar);
      marRepo.save.mockImplementation(async (m: any) => m);

      await service.updateMarStatus(
        'mar-2',
        MarStatus.HELD,
        facilityId,
        'Patient refused',
      );

      expect(mar.status).toBe(MarStatus.HELD);
      expect(mar.administeredAt).toBeUndefined();
      expect(mar.holdReason).toBe('Patient refused');
    });

    it('throws NotFoundException when MAR record is not found', async () => {
      marRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateMarStatus(
          'ghost-mar',
          MarStatus.ADMINISTERED,
          facilityId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getMarByVisit ──────────────────────────────────────────────────────────

  describe('getMarByVisit()', () => {
    it('returns MAR records ordered by scheduledAt ASC', async () => {
      const records = [
        { id: 'mar-1', scheduledAt: new Date('2026-03-31T08:00:00') },
        { id: 'mar-2', scheduledAt: new Date('2026-03-31T12:00:00') },
      ];
      marRepo.find.mockResolvedValue(records);

      const result = await service.getMarByVisit(visitId, facilityId);

      expect(marRepo.find).toHaveBeenCalledWith({
        where: { visitId, facilityId },
        order: { scheduledAt: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });
  });
});
