import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Like } from 'typeorm';

import { DoctorService } from './doctor.service';
import { Consultation } from './entities/consultation.entity';
import {
  Prescription,
  PrescriptionStatus,
} from './entities/prescription.entity';
import { PrescriptionItem } from './entities/prescription-item.entity';
import { Icd10 } from './entities/icd10.entity';
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

describe('DoctorService', () => {
  let service: DoctorService;
  let consultationRepo: ReturnType<typeof makeRepo>;
  let prescriptionRepo: ReturnType<typeof makeRepo>;
  let prescriptionItemRepo: ReturnType<typeof makeRepo>;
  let icd10Repo: ReturnType<typeof makeRepo>;
  let visitRepo: ReturnType<typeof makeRepo>;

  const facilityId = 'facility-001';
  const doctorId = 'doctor-001';
  const visitId = 'visit-001';

  beforeEach(async () => {
    consultationRepo = makeRepo();
    prescriptionRepo = makeRepo();
    prescriptionItemRepo = makeRepo();
    icd10Repo = makeRepo();
    visitRepo = makeRepo();

    // Default: visit exists
    visitRepo.findOne.mockResolvedValue({ id: visitId, facilityId });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorService,
        {
          provide: getRepositoryToken(Consultation),
          useValue: consultationRepo,
        },
        {
          provide: getRepositoryToken(Prescription),
          useValue: prescriptionRepo,
        },
        {
          provide: getRepositoryToken(PrescriptionItem),
          useValue: prescriptionItemRepo,
        },
        { provide: getRepositoryToken(Icd10), useValue: icd10Repo },
        { provide: getRepositoryToken(Visit), useValue: visitRepo },
      ],
    }).compile();

    service = module.get<DoctorService>(DoctorService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createConsultation ─────────────────────────────────────────────────────

  describe('createConsultation()', () => {
    it('serializes diagnoses array to a JSON string', async () => {
      const diagnoses = [{ code: 'J06.9', description: 'Acute URTI' }];
      consultationRepo.create.mockImplementation((data: any) => data);
      consultationRepo.save.mockImplementation(async (c: any) => c);

      const dto: any = {
        visitId,
        patientId: 'p-1',
        diagnoses,
        chiefComplaint: 'Sore throat',
      };

      await service.createConsultation(dto, facilityId, doctorId);

      const created = consultationRepo.create.mock.calls[0][0] as any;
      expect(typeof created.diagnoses).toBe('string');
      expect(JSON.parse(created.diagnoses)).toEqual(diagnoses);
    });

    it('sets facilityId and doctorId on the consultation', async () => {
      consultationRepo.create.mockImplementation((data: any) => data);
      consultationRepo.save.mockImplementation(async (c: any) => c);

      const dto: any = { visitId, patientId: 'p-1', chiefComplaint: 'Fever' };

      await service.createConsultation(dto, facilityId, doctorId);

      const created = consultationRepo.create.mock.calls[0][0] as any;
      expect(created.facilityId).toBe(facilityId);
      expect(created.doctorId).toBe(doctorId);
    });

    it('converts followUpDate string to a Date object', async () => {
      consultationRepo.create.mockImplementation((data: any) => data);
      consultationRepo.save.mockImplementation(async (c: any) => c);

      const dto: any = {
        visitId,
        patientId: 'p-1',
        followUpDate: '2026-04-14',
      };

      await service.createConsultation(dto, facilityId, doctorId);

      const created = consultationRepo.create.mock.calls[0][0] as any;
      expect(created.followUpDate).toBeInstanceOf(Date);
    });

    it('leaves diagnoses undefined when not provided', async () => {
      consultationRepo.create.mockImplementation((data: any) => data);
      consultationRepo.save.mockImplementation(async (c: any) => c);

      const dto: any = { visitId, patientId: 'p-1' };

      await service.createConsultation(dto, facilityId, doctorId);

      const created = consultationRepo.create.mock.calls[0][0] as any;
      expect(created.diagnoses).toBeUndefined();
    });
  });

  // ── getConsultation ────────────────────────────────────────────────────────

  describe('getConsultation()', () => {
    it('returns the consultation when found', async () => {
      const consultation = { id: 'c-1', visitId, facilityId };
      consultationRepo.findOne.mockResolvedValue(consultation);

      const result = await service.getConsultation(visitId, facilityId);

      expect(consultationRepo.findOne).toHaveBeenCalledWith({
        where: { visitId, facilityId },
      });
      expect(result).toEqual(consultation);
    });

    it('throws NotFoundException when consultation does not exist', async () => {
      consultationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getConsultation('ghost-visit', facilityId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── completeConsultation ───────────────────────────────────────────────────

  describe('completeConsultation()', () => {
    it('sets isComplete to true and completedAt timestamp', async () => {
      const consultation: Partial<Consultation> = {
        id: 'c-1',
        facilityId,
        isComplete: false,
        completedAt: undefined as any,
      };
      consultationRepo.findOne.mockResolvedValue(consultation);
      consultationRepo.save.mockImplementation(async (c: any) => c);

      const before = new Date();
      await service.completeConsultation('c-1', {} as any, facilityId);
      const after = new Date();

      expect(consultation.isComplete).toBe(true);
      expect(consultation.completedAt).toBeInstanceOf(Date);
      expect(consultation.completedAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(consultation.completedAt!.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });

    it('throws NotFoundException when consultation is not found', async () => {
      consultationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.completeConsultation('ghost-id', {} as any, facilityId),
      ).rejects.toThrow(NotFoundException);
    });

    it('merges dto fields onto the consultation', async () => {
      const consultation: Partial<Consultation> = {
        id: 'c-1',
        facilityId,
        isComplete: false,
        clinicalNotes: '',
      };
      consultationRepo.findOne.mockResolvedValue(consultation);
      consultationRepo.save.mockImplementation(async (c: any) => c);

      await service.completeConsultation(
        'c-1',
        { clinicalNotes: 'Patient is stable' } as any,
        facilityId,
      );

      expect(consultation.clinicalNotes).toBe('Patient is stable');
    });
  });

  // ── finalizePrescription ───────────────────────────────────────────────────

  describe('finalizePrescription()', () => {
    it('sets status to FINALIZED and saves', async () => {
      const prescription: Partial<Prescription> = {
        id: 'presc-1',
        facilityId,
        status: PrescriptionStatus.DRAFT,
      };
      prescriptionRepo.findOne.mockResolvedValue(prescription);
      prescriptionRepo.save.mockImplementation(async (p: any) => p);

      const result = await service.finalizePrescription('presc-1', facilityId);

      expect(result.status).toBe(PrescriptionStatus.FINALIZED);
      expect(prescriptionRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when prescription is not found', async () => {
      prescriptionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.finalizePrescription('ghost-id', facilityId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── getPrescription ────────────────────────────────────────────────────────

  describe('getPrescription()', () => {
    it('throws NotFoundException when no prescription exists for the visit', async () => {
      prescriptionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getPrescription(visitId, facilityId),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns prescription with items when found', async () => {
      const prescription = { id: 'presc-1', visitId, facilityId };
      const items = [
        { id: 'item-1', prescriptionId: 'presc-1', drugName: 'Amoxicillin' },
        { id: 'item-2', prescriptionId: 'presc-1', drugName: 'Ibuprofen' },
      ];

      prescriptionRepo.findOne.mockResolvedValue(prescription);
      prescriptionItemRepo.find.mockResolvedValue(items);

      const result = await service.getPrescription(visitId, facilityId);

      expect(result).not.toBeNull();
      expect(result!.items).toHaveLength(2);
      expect(prescriptionItemRepo.find).toHaveBeenCalledWith({
        where: { prescriptionId: 'presc-1', facilityId },
      });
    });

    it('returns empty items array when prescription has no items', async () => {
      const prescription = { id: 'presc-2', visitId, facilityId };
      prescriptionRepo.findOne.mockResolvedValue(prescription);
      prescriptionItemRepo.find.mockResolvedValue([]);

      const result = await service.getPrescription(visitId, facilityId);

      expect(result!.items).toHaveLength(0);
    });
  });

  // ── searchIcd10 ────────────────────────────────────────────────────────────

  describe('searchIcd10()', () => {
    it('queries both code and description with LIKE pattern', async () => {
      const codes: Partial<Icd10>[] = [
        { id: 'icd-1', code: 'J06.9', description: 'Acute URTI' },
      ];
      icd10Repo.find.mockResolvedValue(codes);

      const result = await service.searchIcd10('J06');

      expect(icd10Repo.find).toHaveBeenCalledWith({
        where: [{ code: Like('%J06%') }, { description: Like('%J06%') }],
        take: 20,
      });
      expect(result).toHaveLength(1);
    });

    it('returns an empty array when no matches are found', async () => {
      icd10Repo.find.mockResolvedValue([]);

      const result = await service.searchIcd10('ZZZUNKNOWN');

      expect(result).toEqual([]);
    });

    it('limits results to 20 entries', async () => {
      icd10Repo.find.mockResolvedValue([]);

      await service.searchIcd10('fever');

      const callArgs = icd10Repo.find.mock.calls[0][0] as any;
      expect(callArgs.take).toBe(20);
    });
  });

  // ── getCommonIcd10 ─────────────────────────────────────────────────────────

  describe('getCommonIcd10()', () => {
    it('queries only codes marked as isCommon with limit 50', async () => {
      icd10Repo.find.mockResolvedValue([]);

      await service.getCommonIcd10();

      expect(icd10Repo.find).toHaveBeenCalledWith({
        where: { isCommon: true },
        take: 50,
      });
    });

    it('returns the list of common ICD-10 codes', async () => {
      const common: Partial<Icd10>[] = [
        { id: 'c1', code: 'J00', description: 'Common cold', isCommon: true },
        { id: 'c2', code: 'K29.7', description: 'Gastritis', isCommon: true },
      ];
      icd10Repo.find.mockResolvedValue(common);

      const result = await service.getCommonIcd10();

      expect(result).toHaveLength(2);
    });
  });

  // ── createPrescription ─────────────────────────────────────────────────────

  describe('createPrescription()', () => {
    it('sets prescribedById and prescriptionDate', async () => {
      prescriptionRepo.create.mockImplementation((data: any) => data);
      prescriptionRepo.save.mockImplementation(async (p: any) => p);

      const dto: any = { visitId, patientId: 'p-1', consultationId: 'c-1' };

      await service.createPrescription(dto, facilityId, doctorId);

      const created = prescriptionRepo.create.mock.calls[0][0] as any;
      expect(created.prescribedById).toBe(doctorId);
      expect(created.prescriptionDate).toBeInstanceOf(Date);
    });
  });

  // ── updateConsultation ─────────────────────────────────────────────────────

  describe('updateConsultation()', () => {
    it('serializes diagnoses and saves updated consultation', async () => {
      const consultation: Partial<Consultation> = {
        id: 'c-1',
        facilityId,
        diagnoses: '[]',
      };
      consultationRepo.findOne.mockResolvedValue(consultation);
      consultationRepo.save.mockImplementation(async (c: any) => c);

      const newDiagnoses = [{ code: 'A09', description: 'Diarrhoea' }];
      await service.updateConsultation(
        'c-1',
        { diagnoses: newDiagnoses } as any,
        facilityId,
      );

      expect(consultation.diagnoses).toBe(JSON.stringify(newDiagnoses));
      expect(consultationRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when consultation is not found', async () => {
      consultationRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateConsultation('ghost', {} as any, facilityId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
