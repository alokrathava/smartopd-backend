import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CrmService } from './crm.service';
import { FollowUp, FollowUpStatus } from './entities/follow-up.entity';
import { PatientSegment } from './entities/patient-segment.entity';
import { CrmCampaign } from './entities/crm-campaign.entity';
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

const mockFollowUpRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockSegmentRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockCampaignRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockPatientRepo = {
  findOne: jest.fn(),
};

describe('CrmService', () => {
  let service: CrmService;

  const facilityId = 'fac-test';

  beforeEach(async () => {
    jest.clearAllMocks();

    mockFollowUpRepo.createQueryBuilder.mockReturnValue(makeQb());
    mockSegmentRepo.createQueryBuilder.mockReturnValue(makeQb());
    mockCampaignRepo.createQueryBuilder.mockReturnValue(makeQb());

    // Default: patient exists for createFollowUp tests
    mockPatientRepo.findOne.mockResolvedValue({ id: 'p1', facilityId });
    // Default: segment exists for createCampaign tests
    mockSegmentRepo.findOne.mockResolvedValue({ id: 'seg-1', facilityId });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmService,
        { provide: getRepositoryToken(FollowUp), useValue: mockFollowUpRepo },
        { provide: getRepositoryToken(PatientSegment), useValue: mockSegmentRepo },
        { provide: getRepositoryToken(CrmCampaign), useValue: mockCampaignRepo },
        { provide: getRepositoryToken(Patient), useValue: mockPatientRepo },
      ],
    }).compile();

    service = module.get<CrmService>(CrmService);
  });

  // ─── createFollowUp() ─────────────────────────────────────────────────────

  describe('createFollowUp()', () => {
    it('creates and saves a follow-up with facilityId', async () => {
      const dto = { patientId: 'p1', reason: 'Post-op review', scheduledDate: '2026-04-10' };
      const saved = { id: 'fu-1', ...dto, facilityId };
      mockFollowUpRepo.create.mockReturnValue(saved);
      mockFollowUpRepo.save.mockResolvedValue(saved);

      const result = await service.createFollowUp(dto as any, facilityId);

      expect(mockFollowUpRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId }),
      );
      expect(mockFollowUpRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(saved);
    });

    it('converts scheduledDate string to Date and stores as followUpDate', async () => {
      const dto = { patientId: 'p1', scheduledDate: '2026-05-01' };
      mockFollowUpRepo.create.mockImplementation((data) => data);
      mockFollowUpRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.createFollowUp(dto as any, facilityId);

      const callArg = mockFollowUpRepo.create.mock.calls[0][0];
      expect(callArg.followUpDate).toBeInstanceOf(Date);
    });

    it('throws NotFoundException when patient does not exist', async () => {
      mockPatientRepo.findOne.mockResolvedValue(null);

      const dto = { patientId: 'no-patient', scheduledDate: '2026-05-01' };

      await expect(
        service.createFollowUp(dto as any, facilityId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getFollowUps() ────────────────────────────────────────────────────────

  describe('getFollowUps()', () => {
    it('returns all follow-ups for a facility with no filters', async () => {
      const qb = makeQb();
      const followUps = [{ id: 'fu-1' }, { id: 'fu-2' }];
      qb.getMany.mockResolvedValue(followUps);
      mockFollowUpRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getFollowUps(facilityId);

      expect(qb.where).toHaveBeenCalledWith(
        expect.stringContaining('facilityId'),
        { facilityId },
      );
      expect(result).toEqual(followUps);
    });

    it('applies status filter when provided', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([]);
      mockFollowUpRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getFollowUps(facilityId, { status: FollowUpStatus.PENDING });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        { status: FollowUpStatus.PENDING },
      );
    });

    it('applies patientId filter when provided', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([]);
      mockFollowUpRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getFollowUps(facilityId, { patientId: 'p-abc' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('patientId'),
        { patientId: 'p-abc' },
      );
    });

    it('applies date range filter when date provided', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([]);
      mockFollowUpRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getFollowUps(facilityId, { date: '2026-04-15' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('followUpDate >='),
        expect.objectContaining({ d: expect.any(Date), next: expect.any(Date) }),
      );
    });
  });

  // ─── createSegment() ──────────────────────────────────────────────────────

  describe('createSegment()', () => {
    it('creates and saves a segment with facilityId', async () => {
      const dto = { name: 'Diabetic Patients', description: 'All diabetic patients' };
      const saved = { id: 'seg-1', ...dto, facilityId };
      mockSegmentRepo.create.mockReturnValue(saved);
      mockSegmentRepo.save.mockResolvedValue(saved);

      const result = await service.createSegment(dto as any, facilityId);

      expect(mockSegmentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId }),
      );
      expect(result).toBe(saved);
    });

    it('uses empty object as default criteria when not provided', async () => {
      const dto = { name: 'All Patients' };
      mockSegmentRepo.create.mockImplementation((data) => data);
      mockSegmentRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.createSegment(dto as any, facilityId);

      const callArg = mockSegmentRepo.create.mock.calls[0][0];
      expect(callArg.criteria).toBe('{}');
    });

    it('uses provided criteria when present', async () => {
      const criteria = JSON.stringify({ diagnosis: 'diabetes' });
      const dto = { name: 'Diabetic', criteria };
      mockSegmentRepo.create.mockImplementation((data) => data);
      mockSegmentRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.createSegment(dto as any, facilityId);

      const callArg = mockSegmentRepo.create.mock.calls[0][0];
      expect(callArg.criteria).toBe(criteria);
    });
  });

  // ─── createCampaign() ─────────────────────────────────────────────────────

  describe('createCampaign()', () => {
    it('creates and saves a campaign with facilityId', async () => {
      const dto = { name: 'Diabetes Awareness', channel: 'SMS', message: 'Get checked!', segmentId: 'seg-1' };
      const saved = { id: 'camp-1', ...dto, facilityId };
      mockCampaignRepo.create.mockReturnValue(saved);
      mockCampaignRepo.save.mockResolvedValue(saved);

      const result = await service.createCampaign(dto as any, facilityId);

      expect(mockCampaignRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId }),
      );
      expect(result).toBe(saved);
    });

    it('converts scheduledAt string to Date when provided', async () => {
      const dto = { name: 'Reminder', channel: 'EMAIL', scheduledAt: '2026-05-01T09:00:00', segmentId: 'seg-1' };
      mockCampaignRepo.create.mockImplementation((data) => data);
      mockCampaignRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.createCampaign(dto as any, facilityId);

      const callArg = mockCampaignRepo.create.mock.calls[0][0];
      expect(callArg.scheduledAt).toBeInstanceOf(Date);
    });

    it('leaves scheduledAt undefined when not provided', async () => {
      const dto = { name: 'Immediate Campaign', channel: 'SMS', segmentId: 'seg-1' };
      mockCampaignRepo.create.mockImplementation((data) => data);
      mockCampaignRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.createCampaign(dto as any, facilityId);

      const callArg = mockCampaignRepo.create.mock.calls[0][0];
      expect(callArg.scheduledAt).toBeUndefined();
    });
  });

  // ─── updateFollowUp() ─────────────────────────────────────────────────────

  describe('updateFollowUp()', () => {
    it('throws NotFoundException when follow-up does not exist', async () => {
      mockFollowUpRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateFollowUp('no-fu', { status: FollowUpStatus.COMPLETED }, facilityId),
      ).rejects.toThrow(NotFoundException);
    });

    it('sets completedAt when status is COMPLETED', async () => {
      const followUp = {
        id: 'fu-1',
        facilityId,
        status: FollowUpStatus.PENDING,
        completedAt: null,
      };
      mockFollowUpRepo.findOne.mockResolvedValue(followUp);
      mockFollowUpRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.updateFollowUp('fu-1', { status: FollowUpStatus.COMPLETED }, facilityId);

      expect(followUp.completedAt).toBeInstanceOf(Date);
    });

    it('updates notes when provided', async () => {
      const followUp = { id: 'fu-1', facilityId, status: FollowUpStatus.PENDING, notes: '' };
      mockFollowUpRepo.findOne.mockResolvedValue(followUp);
      mockFollowUpRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.updateFollowUp('fu-1', { notes: 'Called patient, no answer' }, facilityId);

      expect(followUp.notes).toBe('Called patient, no answer');
    });
  });
});
