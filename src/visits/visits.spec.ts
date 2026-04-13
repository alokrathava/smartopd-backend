import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';

import { VisitsService } from './visits.service';
import { Visit, VisitStatus, VisitType } from './entities/visit.entity';
import { UsersService } from '../users/users.service';
import { Role } from '../common/enums/role.enum';

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

describe('VisitsService', () => {
  let service: VisitsService;
  let visitRepo: ReturnType<typeof makeRepo>;

  const facilityId = 'facility-001';
  const userId = 'user-001';

  const baseVisit: Partial<Visit> = {
    id: 'visit-001',
    facilityId,
    visitNumber: 'VISIT-20260101-0001',
    patientId: 'patient-001',
    visitType: VisitType.OPD,
    status: VisitStatus.REGISTERED,
    tokenNumber: 1,
    checkedInAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    visitRepo = makeRepo();

    const mockUsersService = {
      findUserByIdOnly: jest.fn().mockResolvedValue({
        id: 'doctor-001',
        facilityId,
        role: Role.DOCTOR,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitsService,
        { provide: getRepositoryToken(Visit), useValue: visitRepo },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<VisitsService>(VisitsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('generates visitNumber and tokenNumber then saves the visit', async () => {
      const visitNumQb = makeQb();
      visitNumQb.getOne.mockResolvedValue(null);

      const tokenQb = makeQb();
      tokenQb.getCount.mockResolvedValue(0);

      visitRepo.createQueryBuilder
        .mockReturnValueOnce(visitNumQb)
        .mockReturnValueOnce(tokenQb);

      const newVisit = { ...baseVisit };
      visitRepo.create.mockReturnValue(newVisit);
      visitRepo.save.mockResolvedValue(newVisit);

      const dto: any = { patientId: 'patient-001', visitType: VisitType.OPD };

      const result = await service.create(dto, facilityId, userId);

      expect(visitRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId, registeredById: userId }),
      );
      expect(visitRepo.save).toHaveBeenCalled();
      expect(result).toEqual(newVisit);
    });

    it('assigns tokenNumber = count + 1', async () => {
      const visitNumQb = makeQb();
      visitNumQb.getOne.mockResolvedValue(null);

      const tokenQb = makeQb();
      tokenQb.getCount.mockResolvedValue(4);

      visitRepo.createQueryBuilder
        .mockReturnValueOnce(visitNumQb)
        .mockReturnValueOnce(tokenQb);

      visitRepo.create.mockImplementation((data: any) => data);
      visitRepo.save.mockImplementation(async (v: any) => v);

      await service.create(
        { patientId: 'p-1', visitType: VisitType.OPD } as any,
        facilityId,
        userId,
      );

      const created = visitRepo.create.mock.calls[0][0];
      expect(created.tokenNumber).toBe(5);
    });

    it('sets checkedInAt to current time', async () => {
      const visitNumQb = makeQb();
      visitNumQb.getOne.mockResolvedValue(null);

      const tokenQb = makeQb();
      tokenQb.getCount.mockResolvedValue(0);

      visitRepo.createQueryBuilder
        .mockReturnValueOnce(visitNumQb)
        .mockReturnValueOnce(tokenQb);

      visitRepo.create.mockImplementation((data: any) => data);
      visitRepo.save.mockImplementation(async (v: any) => v);

      const before = new Date();
      await service.create(
        { patientId: 'p-1', visitType: VisitType.OPD } as any,
        facilityId,
        userId,
      );
      const after = new Date();

      const created = visitRepo.create.mock.calls[0][0];
      expect(created.checkedInAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(created.checkedInAt.getTime()).toBeLessThanOrEqual(
        after.getTime(),
      );
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns the visit when found', async () => {
      visitRepo.findOne.mockResolvedValue(baseVisit);

      const result = await service.findOne('visit-001', facilityId);

      expect(result).toEqual(baseVisit);
      expect(visitRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'visit-001', facilityId, deletedAt: IsNull() },
      });
    });

    it('throws NotFoundException when visit does not exist', async () => {
      visitRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('ghost-id', facilityId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── updateStatus ───────────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    it('sets nurseSeenAt when status is WITH_NURSE', async () => {
      const visit = { ...baseVisit };
      visitRepo.findOne.mockResolvedValue(visit);
      visitRepo.save.mockImplementation(async (v: any) => v);

      await service.updateStatus(
        'visit-001',
        { status: VisitStatus.WITH_NURSE },
        facilityId,
      );

      expect(visit.status).toBe(VisitStatus.WITH_NURSE);
      expect(visit.nurseSeenAt).toBeInstanceOf(Date);
    });

    it('sets doctorSeenAt when status is WITH_DOCTOR', async () => {
      const visit = { ...baseVisit };
      visitRepo.findOne.mockResolvedValue(visit);
      visitRepo.save.mockImplementation(async (v: any) => v);

      await service.updateStatus(
        'visit-001',
        { status: VisitStatus.WITH_DOCTOR },
        facilityId,
      );

      expect(visit.status).toBe(VisitStatus.WITH_DOCTOR);
      expect(visit.doctorSeenAt).toBeInstanceOf(Date);
    });

    it('sets completedAt when status is COMPLETED', async () => {
      const visit = { ...baseVisit };
      visitRepo.findOne.mockResolvedValue(visit);
      visitRepo.save.mockImplementation(async (v: any) => v);

      await service.updateStatus(
        'visit-001',
        { status: VisitStatus.COMPLETED },
        facilityId,
      );

      expect(visit.status).toBe(VisitStatus.COMPLETED);
      expect(visit.completedAt).toBeInstanceOf(Date);
    });

    it('sets visitNotes when notes are provided', async () => {
      const visit = { ...baseVisit };
      visitRepo.findOne.mockResolvedValue(visit);
      visitRepo.save.mockImplementation(async (v: any) => v);

      await service.updateStatus(
        'visit-001',
        { status: VisitStatus.WAITING, notes: 'Patient is anxious' },
        facilityId,
      );

      expect(visit.visitNotes).toBe('Patient is anxious');
    });
  });

  // ── cancel ─────────────────────────────────────────────────────────────────

  describe('cancel()', () => {
    it('sets status to CANCELLED and saves', async () => {
      const visit = { ...baseVisit };
      visitRepo.findOne.mockResolvedValue(visit);
      visitRepo.save.mockImplementation(async (v: any) => v);

      const result = await service.cancel('visit-001', facilityId);

      expect(result.status).toBe(VisitStatus.CANCELLED);
      expect(visitRepo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when visit is not found', async () => {
      visitRepo.findOne.mockResolvedValue(null);

      await expect(service.cancel('ghost-id', facilityId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── assignDoctor ───────────────────────────────────────────────────────────

  describe('assignDoctor()', () => {
    it('sets doctorId on the visit', async () => {
      const visit = { ...baseVisit };
      visitRepo.findOne.mockResolvedValue(visit);
      visitRepo.save.mockImplementation(async (v: any) => v);

      const result = await service.assignDoctor(
        'visit-001',
        'doctor-001',
        facilityId,
      );

      expect(result.doctorId).toBe('doctor-001');
    });

    it('keeps status WAITING when visit is in REGISTERED state', async () => {
      const visit = { ...baseVisit, status: VisitStatus.REGISTERED };
      visitRepo.findOne.mockResolvedValue(visit);
      visitRepo.save.mockImplementation(async (v: any) => v);

      const result = await service.assignDoctor(
        'visit-001',
        'doctor-001',
        facilityId,
      );

      expect(result.status).toBe(VisitStatus.WAITING);
    });

    it('does not change status when already WITH_NURSE', async () => {
      const visit = { ...baseVisit, status: VisitStatus.WITH_NURSE };
      visitRepo.findOne.mockResolvedValue(visit);
      visitRepo.save.mockImplementation(async (v: any) => v);

      const result = await service.assignDoctor(
        'visit-001',
        'doctor-001',
        facilityId,
      );

      expect(result.status).toBe(VisitStatus.WITH_NURSE);
    });
  });

  // ── completeVisit ──────────────────────────────────────────────────────────

  describe('completeVisit()', () => {
    it('sets COMPLETED status and completedAt timestamp', async () => {
      const visit = { ...baseVisit, status: VisitStatus.WITH_DOCTOR };
      visitRepo.findOne.mockResolvedValue(visit);
      visitRepo.save.mockImplementation(async (v: any) => v);

      const before = new Date();
      const result = await service.completeVisit('visit-001', facilityId);
      const after = new Date();

      expect(result.status).toBe(VisitStatus.COMPLETED);
      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.completedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(result.completedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // ── markNoShow ─────────────────────────────────────────────────────────────

  describe('markNoShow()', () => {
    it('sets status to NO_SHOW', async () => {
      const visit = { ...baseVisit };
      visitRepo.findOne.mockResolvedValue(visit);
      visitRepo.save.mockImplementation(async (v: any) => v);

      const result = await service.markNoShow('visit-001', facilityId);

      expect(result.status).toBe(VisitStatus.NO_SHOW);
    });
  });

  // ── startTriage ────────────────────────────────────────────────────────────

  describe('startTriage()', () => {
    it('sets WITH_NURSE status and nurseSeenAt', async () => {
      const visit = { ...baseVisit };
      visitRepo.findOne.mockResolvedValue(visit);
      visitRepo.save.mockImplementation(async (v: any) => v);

      const result = await service.startTriage('visit-001', facilityId);

      expect(result.status).toBe(VisitStatus.WITH_NURSE);
      expect(result.nurseSeenAt).toBeInstanceOf(Date);
    });
  });

  // ── startConsultation ──────────────────────────────────────────────────────

  describe('startConsultation()', () => {
    it('sets WITH_DOCTOR status and doctorSeenAt', async () => {
      const visit = { ...baseVisit };
      visitRepo.findOne.mockResolvedValue(visit);
      visitRepo.save.mockImplementation(async (v: any) => v);

      const result = await service.startConsultation('visit-001', facilityId);

      expect(result.status).toBe(VisitStatus.WITH_DOCTOR);
      expect(result.doctorSeenAt).toBeInstanceOf(Date);
    });
  });
});
