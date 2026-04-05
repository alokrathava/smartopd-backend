import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OtService } from './ot.service';
import { OtBooking, OtStatus, OtUrgency } from './entities/ot-booking.entity';

const makeQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
  getOne: jest.fn().mockResolvedValue(null),
  getCount: jest.fn().mockResolvedValue(0),
});

const mockOtRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQueryBuilder()),
};

const FACILITY_ID = 'facility-uuid-001';

const baseBookingDto = {
  patientId: 'patient-1',
  surgeonId: 'surgeon-1',
  otRoomId: 'ot-room-1',
  scheduledStart: '2026-04-01T08:00:00.000Z',
  scheduledEnd: '2026-04-01T10:00:00.000Z',
  procedureName: 'Appendectomy',
  urgency: OtUrgency.ELECTIVE,
};

describe('OtService', () => {
  let service: OtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtService,
        { provide: getRepositoryToken(OtBooking), useValue: mockOtRepo },
      ],
    }).compile();

    service = module.get<OtService>(OtService);
    jest.clearAllMocks();
  });

  // ─── create (book OT) ─────────────────────────────────────────────────────

  describe('create', () => {
    it('throws BadRequestException when scheduledEnd is before scheduledStart', async () => {
      const dto = {
        ...baseBookingDto,
        scheduledStart: '2026-04-01T10:00:00.000Z',
        scheduledEnd: '2026-04-01T08:00:00.000Z',
      };

      await expect(service.create(dto as any, FACILITY_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when a conflicting booking exists', async () => {
      const qb = makeQueryBuilder();
      qb.getOne.mockResolvedValue({
        id: 'existing',
        procedureName: 'Hip Replacement',
        scheduledStart: new Date('2026-04-01T08:30:00.000Z'),
        scheduledEnd: new Date('2026-04-01T09:30:00.000Z'),
      });
      mockOtRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.create(baseBookingDto as any, FACILITY_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a booking when no conflict exists', async () => {
      const qb = makeQueryBuilder();
      qb.getOne.mockResolvedValue(null);
      mockOtRepo.createQueryBuilder.mockReturnValue(qb);

      const booking = {
        id: 'book-1',
        ...baseBookingDto,
        facilityId: FACILITY_ID,
        status: OtStatus.BOOKED,
      };
      mockOtRepo.create.mockReturnValue(booking);
      mockOtRepo.save.mockResolvedValue(booking);

      const result = await service.create(baseBookingDto as any, FACILITY_ID);

      expect(result.status).toBe(OtStatus.BOOKED);
      expect(mockOtRepo.save).toHaveBeenCalled();
    });

    it('stores parsed Date objects for scheduledStart and scheduledEnd', async () => {
      const qb = makeQueryBuilder();
      qb.getOne.mockResolvedValue(null);
      mockOtRepo.createQueryBuilder.mockReturnValue(qb);

      const booking = {
        id: 'book-2',
        ...baseBookingDto,
        scheduledStart: new Date(baseBookingDto.scheduledStart),
        scheduledEnd: new Date(baseBookingDto.scheduledEnd),
        facilityId: FACILITY_ID,
      };
      mockOtRepo.create.mockReturnValue(booking);
      mockOtRepo.save.mockResolvedValue(booking);

      const result = await service.create(baseBookingDto as any, FACILITY_ID);

      expect(mockOtRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledStart: new Date(baseBookingDto.scheduledStart),
          scheduledEnd: new Date(baseBookingDto.scheduledEnd),
          facilityId: FACILITY_ID,
        }),
      );
    });
  });

  // ─── findAll (get OT bookings for date) ───────────────────────────────────

  describe('findAll', () => {
    it('returns bookings filtered by date', async () => {
      const bookings = [
        { id: 'b1', scheduledStart: new Date('2026-04-01T08:00:00Z') },
      ];
      const qb = makeQueryBuilder();
      qb.getMany.mockResolvedValue(bookings);
      mockOtRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(FACILITY_ID, { date: '2026-04-01' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'ot.scheduledStart BETWEEN :dayStart AND :dayEnd',
        expect.any(Object),
      );
      expect(result).toHaveLength(1);
    });

    it('filters by surgeonId when provided', async () => {
      const qb = makeQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockOtRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(FACILITY_ID, { surgeonId: 'surgeon-5' });

      expect(qb.andWhere).toHaveBeenCalledWith('ot.surgeonId = :surgeonId', {
        surgeonId: 'surgeon-5',
      });
    });

    it('filters by OT status when provided', async () => {
      const qb = makeQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockOtRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(FACILITY_ID, { status: OtStatus.BOOKED });

      expect(qb.andWhere).toHaveBeenCalledWith('ot.status = :status', {
        status: OtStatus.BOOKED,
      });
    });
  });

  // ─── cancelBooking ────────────────────────────────────────────────────────

  describe('cancelBooking', () => {
    it('throws NotFoundException when booking does not exist', async () => {
      mockOtRepo.findOne.mockResolvedValue(null);

      await expect(
        service.cancelBooking('no-id', 'Patient withdrew', FACILITY_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when booking is already COMPLETED', async () => {
      mockOtRepo.findOne.mockResolvedValue({
        id: 'b1',
        status: OtStatus.COMPLETED,
      });

      await expect(
        service.cancelBooking('b1', 'No reason', FACILITY_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when booking is already CANCELLED', async () => {
      mockOtRepo.findOne.mockResolvedValue({
        id: 'b1',
        status: OtStatus.CANCELLED,
      });

      await expect(
        service.cancelBooking('b1', 'No reason', FACILITY_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('cancels a BOOKED booking and stores the reason', async () => {
      const booking = { id: 'b1', status: OtStatus.BOOKED };
      const saved = {
        ...booking,
        status: OtStatus.CANCELLED,
        cancelledReason: 'Patient withdrew',
      };

      mockOtRepo.findOne.mockResolvedValue(booking);
      mockOtRepo.save.mockResolvedValue(saved);

      const result = await service.cancelBooking(
        'b1',
        'Patient withdrew',
        FACILITY_ID,
      );

      expect(result.status).toBe(OtStatus.CANCELLED);
      expect(result.cancelledReason).toBe('Patient withdrew');
    });
  });

  // ─── updatePreopChecklist / startOt / completeOt ──────────────────────────

  describe('updatePreopChecklist', () => {
    it('sets status to PREOP_CHECK when all checklist items are checked', async () => {
      const booking = {
        id: 'b1',
        status: OtStatus.BOOKED,
        preOpChecklist: null,
      };
      const checklistData = {
        items: [
          { name: 'Consent', checked: true },
          { name: 'Vitals', checked: true },
        ],
      };
      const saved = {
        ...booking,
        status: OtStatus.PREOP_CHECK,
        preOpChecklist: checklistData,
      };

      mockOtRepo.findOne.mockResolvedValue(booking);
      mockOtRepo.save.mockResolvedValue(saved);

      const result = await service.updatePreopChecklist(
        'b1',
        checklistData,
        FACILITY_ID,
      );

      expect(result.status).toBe(OtStatus.PREOP_CHECK);
    });

    it('does not set PREOP_CHECK when some checklist items are unchecked', async () => {
      const booking = { id: 'b1', status: OtStatus.BOOKED };
      const checklistData = {
        items: [
          { name: 'Consent', checked: true },
          { name: 'Vitals', checked: false },
        ],
      };
      const saved = {
        ...booking,
        preOpChecklist: checklistData,
        status: OtStatus.BOOKED,
      };

      mockOtRepo.findOne.mockResolvedValue(booking);
      mockOtRepo.save.mockResolvedValue(saved);

      const result = await service.updatePreopChecklist(
        'b1',
        checklistData,
        FACILITY_ID,
      );

      expect(result.status).toBe(OtStatus.BOOKED);
    });
  });

  describe('startOt', () => {
    it('throws BadRequestException when booking is not in PREOP_CHECK status', async () => {
      mockOtRepo.findOne.mockResolvedValue({
        id: 'b1',
        status: OtStatus.BOOKED,
      });

      await expect(service.startOt('b1', FACILITY_ID)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sets status to IN_PROGRESS and records actualStart', async () => {
      const booking = { id: 'b1', status: OtStatus.PREOP_CHECK };
      const saved = {
        ...booking,
        status: OtStatus.IN_PROGRESS,
        actualStart: new Date(),
      };

      mockOtRepo.findOne.mockResolvedValue(booking);
      mockOtRepo.save.mockResolvedValue(saved);

      const result = await service.startOt('b1', FACILITY_ID);

      expect(result.status).toBe(OtStatus.IN_PROGRESS);
      expect(result.actualStart).toBeDefined();
    });
  });

  describe('completeOt', () => {
    it('throws BadRequestException when booking is not IN_PROGRESS', async () => {
      mockOtRepo.findOne.mockResolvedValue({
        id: 'b1',
        status: OtStatus.BOOKED,
      });

      await expect(
        service.completeOt(
          'b1',
          { intraOpNotes: 'All good' } as any,
          FACILITY_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets status to COMPLETED and records actualEnd', async () => {
      const booking = {
        id: 'b1',
        status: OtStatus.IN_PROGRESS,
        actualStart: new Date(),
      };
      const saved = {
        ...booking,
        status: OtStatus.COMPLETED,
        actualEnd: new Date(),
        intraOpNotes: 'Uneventful',
      };

      mockOtRepo.findOne.mockResolvedValue(booking);
      mockOtRepo.save.mockResolvedValue(saved);

      const result = await service.completeOt(
        'b1',
        { intraOpNotes: 'Uneventful' } as any,
        FACILITY_ID,
      );

      expect(result.status).toBe(OtStatus.COMPLETED);
      expect(result.actualEnd).toBeDefined();
    });
  });

  // ─── postponeBooking ──────────────────────────────────────────────────────

  describe('postponeBooking', () => {
    it('sets status to POSTPONED with new schedule', async () => {
      const booking = { id: 'b1', status: OtStatus.BOOKED };
      const newTime = {
        scheduledStart: '2026-04-05T08:00:00.000Z',
        scheduledEnd: '2026-04-05T10:00:00.000Z',
      };
      const saved = {
        ...booking,
        status: OtStatus.POSTPONED,
        scheduledStart: new Date(newTime.scheduledStart),
        scheduledEnd: new Date(newTime.scheduledEnd),
      };

      mockOtRepo.findOne.mockResolvedValue(booking);
      mockOtRepo.save.mockResolvedValue(saved);

      const result = await service.postponeBooking('b1', newTime, FACILITY_ID);

      expect(result.status).toBe(OtStatus.POSTPONED);
    });
  });
});
