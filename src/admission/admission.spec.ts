import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  AdmissionService,
  CreateAdmissionDto,
  CompleteDischargeDto,
  CreateWardRoundDto,
} from './admission.service';
import {
  Admission,
  AdmissionStatus,
  AdmissionType,
  DischargeType,
} from './entities/admission.entity';
import { WardRound } from './entities/ward-round.entity';
import { WardRoundStop } from './entities/ward-round-stop.entity';
import { DischargeSummary } from './entities/discharge-summary.entity';
import { Bed, BedStatus } from '../room/entities/bed.entity';

const makeQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
  getOne: jest.fn().mockResolvedValue(null),
  getCount: jest.fn().mockResolvedValue(0),
});

const mockAdmissionRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQueryBuilder()),
};

const mockWardRoundRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
};

const mockWardRoundStopRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
};

const mockSummaryRepo = {
  findOne: jest.fn(),
};

const mockBedRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const FACILITY_ID = 'facility-uuid-001';
const USER_ID = 'user-uuid-001';

describe('AdmissionService', () => {
  let service: AdmissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionService,
        { provide: getRepositoryToken(Admission), useValue: mockAdmissionRepo },
        { provide: getRepositoryToken(WardRound), useValue: mockWardRoundRepo },
        {
          provide: getRepositoryToken(WardRoundStop),
          useValue: mockWardRoundStopRepo,
        },
        {
          provide: getRepositoryToken(DischargeSummary),
          useValue: mockSummaryRepo,
        },
        { provide: getRepositoryToken(Bed), useValue: mockBedRepo },
      ],
    }).compile();

    service = module.get<AdmissionService>(AdmissionService);
    jest.clearAllMocks();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateAdmissionDto = {
      patientId: 'patient-1',
      bedId: 'bed-1',
      wardId: 'ward-1',
      admittingDoctorId: 'doctor-1',
      admissionType: AdmissionType.GENERAL,
      chiefComplaint: 'Fever',
    };

    it('throws NotFoundException when bed does not exist', async () => {
      mockBedRepo.findOne.mockResolvedValue(null);

      await expect(service.create(dto, FACILITY_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when bed is not AVAILABLE', async () => {
      mockBedRepo.findOne.mockResolvedValue({
        id: 'bed-1',
        status: BedStatus.OCCUPIED,
      });

      await expect(service.create(dto, FACILITY_ID, USER_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates admission with ACTIVE status and generated admission number', async () => {
      const bed = { id: 'bed-1', status: BedStatus.AVAILABLE };
      const qb = makeQueryBuilder();
      qb.getCount.mockResolvedValue(5);
      mockAdmissionRepo.createQueryBuilder.mockReturnValue(qb);
      mockBedRepo.findOne.mockResolvedValue(bed);

      const admission = {
        id: 'adm-1',
        ...dto,
        facilityId: FACILITY_ID,
        status: AdmissionStatus.ACTIVE,
        admissionNumber: 'ADM-2026-00006',
        admittedAt: new Date(),
      };
      mockAdmissionRepo.create.mockReturnValue(admission);
      mockAdmissionRepo.save.mockResolvedValue(admission);
      mockBedRepo.save.mockResolvedValue({
        ...bed,
        status: BedStatus.OCCUPIED,
      });

      const result = await service.create(dto, FACILITY_ID, USER_ID);

      expect(result.status).toBe(AdmissionStatus.ACTIVE);
      expect(mockAdmissionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: FACILITY_ID,
          status: AdmissionStatus.ACTIVE,
        }),
      );
    });

    it('occupies the bed on successful admission creation', async () => {
      const bed = { id: 'bed-1', status: BedStatus.AVAILABLE };
      const qb = makeQueryBuilder();
      qb.getCount.mockResolvedValue(0);
      mockAdmissionRepo.createQueryBuilder.mockReturnValue(qb);
      mockBedRepo.findOne.mockResolvedValue(bed);

      const admission = {
        id: 'adm-1',
        ...dto,
        facilityId: FACILITY_ID,
        status: AdmissionStatus.ACTIVE,
      };
      mockAdmissionRepo.create.mockReturnValue(admission);
      mockAdmissionRepo.save.mockResolvedValue(admission);
      mockBedRepo.save.mockResolvedValue({});

      await service.create(dto, FACILITY_ID, USER_ID);

      expect(mockBedRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: BedStatus.OCCUPIED,
          currentPatientId: dto.patientId,
        }),
      );
    });
  });

  // ─── findAll (active admissions) ──────────────────────────────────────────

  describe('findAll', () => {
    it('returns admissions filtered by ACTIVE status', async () => {
      const admissions = [
        { id: 'a1', status: AdmissionStatus.ACTIVE },
        { id: 'a2', status: AdmissionStatus.ACTIVE },
      ];
      const qb = makeQueryBuilder();
      qb.getMany.mockResolvedValue(admissions);
      mockAdmissionRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(FACILITY_ID, {
        status: AdmissionStatus.ACTIVE,
      });

      expect(qb.andWhere).toHaveBeenCalledWith('a.status = :status', {
        status: AdmissionStatus.ACTIVE,
      });
      expect(result).toHaveLength(2);
    });

    it('filters by wardId when provided', async () => {
      const qb = makeQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockAdmissionRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(FACILITY_ID, { wardId: 'ward-5' });

      expect(qb.andWhere).toHaveBeenCalledWith('a.wardId = :wardId', {
        wardId: 'ward-5',
      });
    });
  });

  // ─── completeDischarge ────────────────────────────────────────────────────

  describe('completeDischarge', () => {
    const dischargeDto: CompleteDischargeDto = {
      dischargeType: DischargeType.REGULAR,
      dischargeNotes: 'Patient recovered',
    };

    it('throws NotFoundException when admission does not exist', async () => {
      mockAdmissionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.completeDischarge('no-adm', dischargeDto, FACILITY_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when admission is already discharged', async () => {
      mockAdmissionRepo.findOne.mockResolvedValue({
        id: 'a1',
        status: AdmissionStatus.DISCHARGED,
      });

      await expect(
        service.completeDischarge('a1', dischargeDto, FACILITY_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets status to DISCHARGED and dischargedAt timestamp', async () => {
      const admission = {
        id: 'a1',
        status: AdmissionStatus.DISCHARGE_PLANNED,
        bedId: 'bed-1',
        patientId: 'patient-1',
        facilityId: FACILITY_ID,
      };
      const bed = { id: 'bed-1', status: BedStatus.OCCUPIED };
      const saved = {
        ...admission,
        status: AdmissionStatus.DISCHARGED,
        dischargedAt: new Date(),
      };

      mockAdmissionRepo.findOne.mockResolvedValue(admission);
      mockBedRepo.findOne.mockResolvedValue(bed);
      mockBedRepo.save.mockResolvedValue({});
      mockAdmissionRepo.save.mockResolvedValue(saved);

      const result = await service.completeDischarge(
        'a1',
        dischargeDto,
        FACILITY_ID,
      );

      expect(result.status).toBe(AdmissionStatus.DISCHARGED);
      expect(result.dischargedAt).toBeDefined();
    });

    it('frees the bed on discharge', async () => {
      const admission = {
        id: 'a1',
        status: AdmissionStatus.ACTIVE,
        bedId: 'bed-1',
        patientId: 'patient-1',
        facilityId: FACILITY_ID,
      };
      const bed = { id: 'bed-1', status: BedStatus.OCCUPIED };

      mockAdmissionRepo.findOne.mockResolvedValue(admission);
      mockBedRepo.findOne.mockResolvedValue(bed);
      mockBedRepo.save.mockResolvedValue({});
      mockAdmissionRepo.save.mockResolvedValue({
        ...admission,
        status: AdmissionStatus.DISCHARGED,
      });

      await service.completeDischarge('a1', dischargeDto, FACILITY_ID);

      expect(mockBedRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: BedStatus.AVAILABLE }),
      );
    });
  });

  // ─── createWardRound ──────────────────────────────────────────────────────

  describe('createWardRound', () => {
    const roundDto: CreateWardRoundDto = {
      wardId: 'ward-1',
      notes: 'Morning rounds',
      stops: [
        {
          admissionId: 'adm-1',
          bedId: 'bed-1',
          patientId: 'patient-1',
          subjectiveNotes: 'Feeling better',
        },
      ],
    };

    it('creates a ward round with stops', async () => {
      const admission = {
        id: 'adm-1',
        facilityId: FACILITY_ID,
        status: AdmissionStatus.ACTIVE,
      };
      const round = {
        id: 'round-1',
        admissionId: 'adm-1',
        facilityId: FACILITY_ID,
      };
      const stop = { id: 'stop-1', wardRoundId: 'round-1' };

      mockAdmissionRepo.findOne.mockResolvedValue(admission);
      mockWardRoundRepo.create.mockReturnValue(round);
      mockWardRoundRepo.save.mockResolvedValue(round);
      mockWardRoundStopRepo.create.mockReturnValue(stop);
      mockWardRoundStopRepo.save.mockResolvedValue([stop]);

      const result = await service.createWardRound(
        'adm-1',
        roundDto,
        FACILITY_ID,
        USER_ID,
      );

      expect(mockWardRoundRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          admissionId: 'adm-1',
          facilityId: FACILITY_ID,
        }),
      );
      expect(result.id).toBe('round-1');
    });

    it('throws NotFoundException when admission does not exist', async () => {
      mockAdmissionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createWardRound('no-adm', roundDto, FACILITY_ID, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getDischargeSummary ──────────────────────────────────────────────────

  describe('getDischargeSummary', () => {
    it('returns null when no discharge summary exists', async () => {
      mockAdmissionRepo.findOne.mockResolvedValue({
        id: 'a1',
        facilityId: FACILITY_ID,
      });
      mockSummaryRepo.findOne.mockResolvedValue(null);

      const result = await service.getDischargeSummary('a1', FACILITY_ID);

      expect(result).toBeNull();
    });

    it('returns the discharge summary when it exists', async () => {
      const summary = {
        id: 'sum-1',
        admissionId: 'a1',
        facilityId: FACILITY_ID,
      };
      mockAdmissionRepo.findOne.mockResolvedValue({
        id: 'a1',
        facilityId: FACILITY_ID,
      });
      mockSummaryRepo.findOne.mockResolvedValue(summary);

      const result = await service.getDischargeSummary('a1', FACILITY_ID);

      expect(result).toEqual(summary);
    });

    it('throws NotFoundException when admission does not exist', async () => {
      mockAdmissionRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getDischargeSummary('no-adm', FACILITY_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── dama ─────────────────────────────────────────────────────────────────

  describe('dama', () => {
    it('sets status to DAMA and discharge type to DAMA', async () => {
      const admission = {
        id: 'a1',
        status: AdmissionStatus.ACTIVE,
        bedId: 'bed-1',
        patientId: 'p1',
        facilityId: FACILITY_ID,
      };
      const saved = {
        ...admission,
        status: AdmissionStatus.DAMA,
        dischargeType: DischargeType.DAMA,
        dischargedAt: new Date(),
      };

      mockAdmissionRepo.findOne.mockResolvedValue(admission);
      mockBedRepo.findOne.mockResolvedValue({
        id: 'bed-1',
        status: BedStatus.OCCUPIED,
      });
      mockBedRepo.save.mockResolvedValue({});
      mockAdmissionRepo.save.mockResolvedValue(saved);

      const result = await service.dama(
        'a1',
        { reason: 'Patient refused treatment' },
        FACILITY_ID,
      );

      expect(result.status).toBe(AdmissionStatus.DAMA);
      expect(result.dischargeType).toBe(DischargeType.DAMA);
    });
  });
});
