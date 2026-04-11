import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { PatientsService } from './patients.service';
import { Patient } from './entities/patient.entity';
import { PatientConsent } from './entities/patient-consent.entity';

// ── Mock factory ───────────────────────────────────────────────────────────────

function makeQb() {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
    getManyAndCount: jest.fn(),
    getOne: jest.fn(),
    getCount: jest.fn(),
  };
  return qb;
}

function makeRepo() {
  return {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
}

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('PatientsService', () => {
  let service: PatientsService;
  let patientRepo: ReturnType<typeof makeRepo>;
  let consentRepo: ReturnType<typeof makeRepo>;

  const facilityId = 'facility-001';
  const userId = 'user-001';

  const basePatient: Partial<Patient> = {
    id: 'patient-001',
    facilityId,
    mrn: 'HOSP-2026-000001',
    firstName: 'Ravi',
    lastName: 'Kumar',
    phone: '+919876543210',
    dateOfBirth: new Date('1990-01-15'),
    deletedAt: null,
  };

  beforeEach(async () => {
    patientRepo = makeRepo();
    consentRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: getRepositoryToken(Patient), useValue: patientRepo },
        { provide: getRepositoryToken(PatientConsent), useValue: consentRepo },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('generates an MRN and saves a new patient', async () => {
      const qb = makeQb();
      qb.getOne.mockResolvedValue(null); // no existing patient
      patientRepo.createQueryBuilder.mockReturnValue(qb);

      const newPatient = { ...basePatient };
      patientRepo.create.mockReturnValue(newPatient);
      patientRepo.save.mockResolvedValue(newPatient);

      const dto: any = {
        firstName: 'Ravi',
        lastName: 'Kumar',
        phone: '+919876543210',
        dateOfBirth: '1990-01-15',
      };

      const result = await service.create(dto, facilityId, userId);

      expect(patientRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId, createdBy: userId }),
      );
      expect(patientRepo.save).toHaveBeenCalled();
      expect(result).toEqual(newPatient);
    });

    it('increments MRN sequence based on last existing patient', async () => {
      const qb = makeQb();
      qb.getOne.mockResolvedValue({ mrn: 'HOSP-2026-000005' });
      patientRepo.createQueryBuilder.mockReturnValue(qb);

      patientRepo.create.mockImplementation((data: any) => data);
      patientRepo.save.mockImplementation(async (p: any) => p);

      const dto: any = {
        firstName: 'New',
        lastName: 'Patient',
        phone: '+910000000000',
        dateOfBirth: '2000-05-01',
      };

      await service.create(dto, facilityId, userId);

      const created = patientRepo.create.mock.calls[0][0];
      expect(created.mrn).toBe('HOSP-2026-000006');
    });

    it('starts MRN at 000001 when facility has no existing patients', async () => {
      const qb = makeQb();
      qb.getOne.mockResolvedValue(null);
      patientRepo.createQueryBuilder.mockReturnValue(qb);

      patientRepo.create.mockImplementation((data: any) => data);
      patientRepo.save.mockImplementation(async (p: any) => p);

      await service.create(
        {
          firstName: 'A',
          lastName: 'B',
          phone: '+910000000001',
          dateOfBirth: '1985-03-12',
        } as any,
        facilityId,
        userId,
      );

      const created = patientRepo.create.mock.calls[0][0];
      const year = new Date().getFullYear();
      expect(created.mrn).toBe(`HOSP-${year}-000001`);
    });
  });

  // ── findAll ────────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns paginated results without search filter', async () => {
      const qb = makeQb();
      qb.getManyAndCount.mockResolvedValue([[basePatient], 1]);
      patientRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(facilityId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('applies an andWhere search clause when search param is provided', async () => {
      const qb = makeQb();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      patientRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(facilityId, { search: 'Ravi', page: 1, limit: 10 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.objectContaining({ s: '%Ravi%' }),
      );
    });

    it('defaults to page 1 and limit 20 when not specified', async () => {
      const qb = makeQb();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      patientRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(facilityId, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns the patient when found', async () => {
      patientRepo.findOne.mockResolvedValue(basePatient);

      const result = await service.findOne('patient-001', facilityId);

      expect(result).toEqual(basePatient);
      expect(patientRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'patient-001', facilityId, deletedAt: IsNull() },
      });
    });

    it('throws NotFoundException when patient does not exist', async () => {
      patientRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('ghost-id', facilityId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('merges dto fields onto the patient and saves', async () => {
      const existing = { ...basePatient };
      patientRepo.findOne.mockResolvedValue(existing);
      patientRepo.save.mockImplementation(async (p: any) => p);

      const dto: any = { firstName: 'Rajesh', phone: '+911234567890' };

      const result = await service.update('patient-001', dto, facilityId);

      expect(result.firstName).toBe('Rajesh');
      expect(result.phone).toBe('+911234567890');
      expect(patientRepo.save).toHaveBeenCalled();
    });

    it('converts dateOfBirth string to Date object when provided', async () => {
      const existing = { ...basePatient };
      patientRepo.findOne.mockResolvedValue(existing);
      patientRepo.save.mockImplementation(async (p: any) => p);

      await service.update(
        'patient-001',
        { dateOfBirth: '1995-06-20' } as any,
        facilityId,
      );

      expect(existing.dateOfBirth).toBeInstanceOf(Date);
    });
  });

  // ── softDelete ─────────────────────────────────────────────────────────────

  describe('softDelete()', () => {
    it('calls softDelete on the repo with the patient id', async () => {
      patientRepo.findOne.mockResolvedValue(basePatient);
      patientRepo.softDelete.mockResolvedValue({ affected: 1 });

      await service.softDelete('patient-001', facilityId);

      expect(patientRepo.softDelete).toHaveBeenCalledWith('patient-001');
    });

    it('throws NotFoundException when the patient does not exist', async () => {
      patientRepo.findOne.mockResolvedValue(null);

      await expect(service.softDelete('ghost-id', facilityId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── searchByPhone ──────────────────────────────────────────────────────────

  describe('searchByPhone()', () => {
    it('queries repo by phone and facilityId', async () => {
      patientRepo.find.mockResolvedValue([basePatient]);

      const result = await service.searchByPhone('+919876543210', facilityId);

      expect(patientRepo.find).toHaveBeenCalledWith({
        where: { phone: '+919876543210', facilityId },
      });
      expect(result).toHaveLength(1);
    });

    it('returns an empty array when no matching patients', async () => {
      patientRepo.find.mockResolvedValue([]);

      const result = await service.searchByPhone('+910000000000', facilityId);

      expect(result).toEqual([]);
    });
  });

  // ── recordConsent ──────────────────────────────────────────────────────────

  describe('recordConsent()', () => {
    it('saves a consent record linked to the patient', async () => {
      patientRepo.findOne.mockResolvedValue(basePatient);
      const savedConsent = { id: 'consent-001', patientId: 'patient-001' };
      consentRepo.create.mockReturnValue(savedConsent);
      consentRepo.save.mockResolvedValue(savedConsent);

      const dto: any = { consentType: 'TREATMENT', isGuardian: false };

      const result = await service.recordConsent(
        'patient-001',
        dto,
        facilityId,
        userId,
      );

      expect(consentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'patient-001',
          facilityId,
          consentGivenBy: userId,
        }),
      );
      expect(consentRepo.save).toHaveBeenCalled();
      expect(result).toEqual(savedConsent);
    });

    it('throws NotFoundException when patient is not found before recording consent', async () => {
      patientRepo.findOne.mockResolvedValue(null);

      await expect(
        service.recordConsent(
          'ghost-id',
          { consentType: 'TREATMENT' } as any,
          facilityId,
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getConsents ────────────────────────────────────────────────────────────

  describe('getConsents()', () => {
    it('returns consents ordered by createdAt DESC', async () => {
      const consents = [
        { id: 'c2', createdAt: new Date('2026-03-02') },
        { id: 'c1', createdAt: new Date('2026-03-01') },
      ];
      consentRepo.find.mockResolvedValue(consents);

      const result = await service.getConsents('patient-001', facilityId);

      expect(consentRepo.find).toHaveBeenCalledWith({
        where: { patientId: 'patient-001', facilityId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });
  });
});
