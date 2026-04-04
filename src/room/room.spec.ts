import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { RoomService } from './room.service';
import { Room, RoomType } from './entities/room.entity';
import { Bed, BedStatus, VALID_BED_TRANSITIONS } from './entities/bed.entity';
import { HousekeepingLog, HousekeepingStatus } from './entities/housekeeping-log.entity';

const makeQueryBuilder = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
  getOne: jest.fn().mockResolvedValue(null),
  getCount: jest.fn().mockResolvedValue(0),
});

const mockRoomRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQueryBuilder()),
};

const mockBedRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQueryBuilder()),
};

const mockHkRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(() => makeQueryBuilder()),
};

const FACILITY_ID = 'facility-uuid-001';
const STAFF_ID = 'staff-uuid-001';

describe('RoomService', () => {
  let service: RoomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: getRepositoryToken(Room), useValue: mockRoomRepo },
        { provide: getRepositoryToken(Bed), useValue: mockBedRepo },
        { provide: getRepositoryToken(HousekeepingLog), useValue: mockHkRepo },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
    jest.clearAllMocks();
  });

  // ─── createRoom ───────────────────────────────────────────────────────────

  describe('createRoom', () => {
    it('creates a room with the provided facilityId', async () => {
      const dto = { name: 'Ward A - Room 1', type: RoomType.GENERAL_WARD, floor: '1', ward: 'A' };
      const expected = { id: 'room-1', ...dto, facilityId: FACILITY_ID };

      mockRoomRepo.create.mockReturnValue(expected);
      mockRoomRepo.save.mockResolvedValue(expected);

      const result = await service.createRoom(dto as any, FACILITY_ID);

      expect(mockRoomRepo.create).toHaveBeenCalledWith({ ...dto, facilityId: FACILITY_ID });
      expect(mockRoomRepo.save).toHaveBeenCalledWith(expected);
      expect(result.facilityId).toBe(FACILITY_ID);
    });

    it('saves and returns the new room', async () => {
      const dto = { name: 'ICU Room', type: RoomType.ICU };
      const saved = { id: 'room-icu', ...dto, facilityId: FACILITY_ID };

      mockRoomRepo.create.mockReturnValue(saved);
      mockRoomRepo.save.mockResolvedValue(saved);

      const result = await service.createRoom(dto as any, FACILITY_ID);

      expect(result.id).toBe('room-icu');
      expect(result.type).toBe(RoomType.ICU);
    });
  });

  // ─── findRooms ────────────────────────────────────────────────────────────

  describe('findRooms', () => {
    it('applies floor filter when floor is provided', async () => {
      const qb = makeQueryBuilder();
      const rooms = [{ id: 'r1', floor: '2' }];
      qb.getMany.mockResolvedValue(rooms);
      mockRoomRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findRooms(FACILITY_ID, { floor: '2' });

      expect(qb.andWhere).toHaveBeenCalledWith('r.floor = :floor', { floor: '2' });
      expect(result).toEqual(rooms);
    });

    it('applies type filter when type is provided', async () => {
      const qb = makeQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockRoomRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findRooms(FACILITY_ID, { type: RoomType.ICU });

      expect(qb.andWhere).toHaveBeenCalledWith('r.type = :type', { type: RoomType.ICU });
    });

    it('applies ward filter when ward is provided', async () => {
      const qb = makeQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockRoomRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findRooms(FACILITY_ID, { ward: 'Ward-B' });

      expect(qb.andWhere).toHaveBeenCalledWith('r.ward = :ward', { ward: 'Ward-B' });
    });

    it('returns all rooms when no filters are provided', async () => {
      const qb = makeQueryBuilder();
      const rooms = [{ id: 'r1' }, { id: 'r2' }];
      qb.getMany.mockResolvedValue(rooms);
      mockRoomRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findRooms(FACILITY_ID, {});

      expect(result).toHaveLength(2);
    });
  });

  // ─── createBed ────────────────────────────────────────────────────────────

  describe('createBed', () => {
    it('throws NotFoundException when room does not exist', async () => {
      mockRoomRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createBed({ roomId: 'no-room', bedNumber: 'A1' } as any, FACILITY_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates and saves a bed linked to the room', async () => {
      const room = { id: 'room-1', facilityId: FACILITY_ID };
      const dto = { roomId: 'room-1', bedNumber: 'B2' };
      const saved = { id: 'bed-1', ...dto, facilityId: FACILITY_ID };

      mockRoomRepo.findOne.mockResolvedValue(room);
      mockBedRepo.create.mockReturnValue(saved);
      mockBedRepo.save.mockResolvedValue(saved);

      const result = await service.createBed(dto as any, FACILITY_ID);

      expect(mockBedRepo.create).toHaveBeenCalledWith({ ...dto, facilityId: FACILITY_ID });
      expect(result.facilityId).toBe(FACILITY_ID);
    });
  });

  // ─── getBedBoard ──────────────────────────────────────────────────────────

  describe('getBedBoard', () => {
    it('returns beds with a summary grouped by status', async () => {
      const beds = [
        { id: 'b1', status: BedStatus.AVAILABLE },
        { id: 'b2', status: BedStatus.OCCUPIED },
        { id: 'b3', status: BedStatus.AVAILABLE },
      ];
      const qb = makeQueryBuilder();
      qb.getMany.mockResolvedValue(beds);
      mockBedRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getBedBoard(FACILITY_ID);

      expect(result.total).toBe(3);
      expect(result.summary[BedStatus.AVAILABLE]).toBe(2);
      expect(result.summary[BedStatus.OCCUPIED]).toBe(1);
      expect(result.beds).toEqual(beds);
    });

    it('returns empty board when no beds exist', async () => {
      const qb = makeQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      mockBedRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getBedBoard(FACILITY_ID);

      expect(result.total).toBe(0);
      expect(result.beds).toHaveLength(0);
    });
  });

  // ─── updateBedStatus ──────────────────────────────────────────────────────

  describe('updateBedStatus', () => {
    it('throws NotFoundException when bed does not exist', async () => {
      mockBedRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateBedStatus('no-bed', { status: BedStatus.OCCUPIED } as any, FACILITY_ID, STAFF_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for an invalid transition', async () => {
      const bed = { id: 'bed-1', status: BedStatus.OCCUPIED };
      mockBedRepo.findOne.mockResolvedValue(bed);

      // OCCUPIED -> AVAILABLE is not a valid transition per VALID_BED_TRANSITIONS
      await expect(
        service.updateBedStatus('bed-1', { status: BedStatus.AVAILABLE } as any, FACILITY_ID, STAFF_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates bed status for a valid transition', async () => {
      const bed = { id: 'bed-1', status: BedStatus.AVAILABLE };
      const saved = { ...bed, status: BedStatus.OCCUPIED };

      mockBedRepo.findOne.mockResolvedValue(bed);
      mockHkRepo.create.mockReturnValue({});
      mockHkRepo.save.mockResolvedValue({});
      mockBedRepo.save.mockResolvedValue(saved);

      const result = await service.updateBedStatus(
        'bed-1',
        { status: BedStatus.OCCUPIED } as any,
        FACILITY_ID,
        STAFF_ID,
      );

      expect(result.status).toBe(BedStatus.OCCUPIED);
    });

    it('starts a housekeeping log when status transitions to CLEANING', async () => {
      const bed = { id: 'bed-1', status: BedStatus.OCCUPIED };
      const hkLog = { id: 'hk-1', bedId: 'bed-1', status: HousekeepingStatus.IN_PROGRESS };

      mockBedRepo.findOne.mockResolvedValue(bed);
      mockBedRepo.save.mockResolvedValue({ ...bed, status: BedStatus.CLEANING });
      mockHkRepo.create.mockReturnValue(hkLog);
      mockHkRepo.save.mockResolvedValue(hkLog);

      await service.updateBedStatus('bed-1', { status: BedStatus.CLEANING } as any, FACILITY_ID, STAFF_ID);

      expect(mockHkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ bedId: 'bed-1', status: HousekeepingStatus.IN_PROGRESS }),
      );
    });
  });

  // ─── getBedsForRoom ───────────────────────────────────────────────────────

  describe('getBedsForRoom', () => {
    it('returns all beds for a given room ordered by bedNumber', async () => {
      const beds = [{ id: 'b1', bedNumber: '1' }, { id: 'b2', bedNumber: '2' }];
      mockBedRepo.find.mockResolvedValue(beds);

      const result = await service.getBedsForRoom('room-1', FACILITY_ID);

      expect(mockBedRepo.find).toHaveBeenCalledWith({
        where: { roomId: 'room-1', facilityId: FACILITY_ID },
        order: { bedNumber: 'ASC' },
      });
      expect(result).toHaveLength(2);
    });
  });

  // ─── completeHousekeeping ─────────────────────────────────────────────────

  describe('completeHousekeeping', () => {
    it('throws NotFoundException when no active housekeeping job exists', async () => {
      mockHkRepo.findOne.mockResolvedValue(null);

      await expect(
        service.completeHousekeeping('bed-1', FACILITY_ID, STAFF_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('marks housekeeping as COMPLETED with completedById', async () => {
      const log = {
        id: 'hk-1',
        bedId: 'bed-1',
        status: HousekeepingStatus.IN_PROGRESS,
        completedAt: null,
        completedById: null,
      };
      const saved = { ...log, status: HousekeepingStatus.COMPLETED, completedById: STAFF_ID };

      mockHkRepo.findOne.mockResolvedValue(log);
      mockHkRepo.save.mockResolvedValue(saved);

      const result = await service.completeHousekeeping('bed-1', FACILITY_ID, STAFF_ID, 'Cleaned');

      expect(result.status).toBe(HousekeepingStatus.COMPLETED);
      expect(result.completedById).toBe(STAFF_ID);
    });
  });
});
