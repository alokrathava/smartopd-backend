import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room, RoomType } from './entities/room.entity';
import { Bed, BedStatus, VALID_BED_TRANSITIONS } from './entities/bed.entity';
import {
  HousekeepingLog,
  HousekeepingStatus,
} from './entities/housekeeping-log.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateBedDto } from './dto/create-bed.dto';
import { UpdateBedStatusDto } from './dto/update-bed-status.dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room) private readonly roomRepo: Repository<Room>,
    @InjectRepository(Bed) private readonly bedRepo: Repository<Bed>,
    @InjectRepository(HousekeepingLog)
    private readonly hkRepo: Repository<HousekeepingLog>,
  ) {}

  async createRoom(dto: CreateRoomDto, facilityId: string): Promise<Room> {
    const sanitizedName = dto.name.replace(/<[^>]*>/g, '').trim();
    const room = this.roomRepo.create({
      ...dto,
      name: sanitizedName,
      facilityId,
    });
    return this.roomRepo.save(room);
  }

  async findRooms(
    facilityId: string,
    filters: { type?: RoomType; floor?: string; ward?: string },
  ) {
    const qb = this.roomRepo
      .createQueryBuilder('r')
      .where('r.facilityId = :facilityId', { facilityId })
      .andWhere('r.isActive = true');
    if (filters.type) qb.andWhere('r.type = :type', { type: filters.type });
    if (filters.floor)
      qb.andWhere('r.floor = :floor', { floor: filters.floor });
    if (filters.ward) qb.andWhere('r.ward = :ward', { ward: filters.ward });
    return qb.orderBy('r.name', 'ASC').getMany();
  }

  async createBed(dto: CreateBedDto, facilityId: string): Promise<Bed> {
    const room = await this.roomRepo.findOne({
      where: { id: dto.roomId, facilityId },
    });
    if (!room) throw new NotFoundException('Room not found');
    const bed = this.bedRepo.create({ ...dto, facilityId });
    return this.bedRepo.save(bed);
  }

  async getBedsForRoom(roomId: string, facilityId: string): Promise<Bed[]> {
    return this.bedRepo.find({
      where: { roomId, facilityId },
      order: { bedNumber: 'ASC' },
    });
  }

  async getBedBoard(facilityId: string) {
    const beds = await this.bedRepo
      .createQueryBuilder('b')
      .where('b.facilityId = :facilityId', { facilityId })
      .andWhere('b.isActive = true')
      .orderBy('b.roomId', 'ASC')
      .addOrderBy('b.bedNumber', 'ASC')
      .getMany();

    const byStatus = Object.values(BedStatus).reduce(
      (acc, s) => {
        acc[s] = beds.filter((b) => b.status === s).length;
        return acc;
      },
      {} as Record<string, number>,
    );

    return { beds, summary: byStatus, total: beds.length };
  }

  async getAvailableBeds(facilityId: string, roomType?: RoomType) {
    const qb = this.bedRepo
      .createQueryBuilder('b')
      .innerJoin(Room, 'r', 'r.id = b.roomId')
      .where('b.facilityId = :facilityId', { facilityId })
      .andWhere('b.status = :status', { status: BedStatus.AVAILABLE })
      .andWhere('b.isActive = true');
    if (roomType) qb.andWhere('r.type = :roomType', { roomType });
    return qb.getMany();
  }

  async updateBedStatus(
    bedId: string,
    dto: UpdateBedStatusDto,
    facilityId: string,
    staffId: string,
  ): Promise<Bed> {
    const bed = await this.bedRepo.findOne({
      where: { id: bedId, facilityId },
    });
    if (!bed) throw new NotFoundException('Bed not found');

    const allowed = VALID_BED_TRANSITIONS[bed.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid transition: ${bed.status} → ${dto.status}. Allowed: ${allowed.join(', ')}`,
      );
    }

    if (dto.notes) bed.notes = dto.notes;
    bed.status = dto.status;

    if (dto.status === BedStatus.CLEANING) {
      await this.startHousekeeping(bed.id, facilityId);
    }

    return this.bedRepo.save(bed);
  }

  async startHousekeeping(
    bedId: string,
    facilityId: string,
  ): Promise<HousekeepingLog> {
    const log = this.hkRepo.create({
      bedId,
      facilityId,
      startedAt: new Date(),
      status: HousekeepingStatus.IN_PROGRESS,
    });
    return this.hkRepo.save(log);
  }

  async completeHousekeeping(
    bedId: string,
    facilityId: string,
    staffId: string,
    notes?: string,
  ): Promise<HousekeepingLog> {
    const log = await this.hkRepo.findOne({
      where: { bedId, facilityId, status: HousekeepingStatus.IN_PROGRESS },
      order: { startedAt: 'DESC' },
    });
    if (!log)
      throw new NotFoundException('No active housekeeping job for this bed');
    log.completedAt = new Date();
    log.completedById = staffId;
    log.status = HousekeepingStatus.COMPLETED;
    if (notes) log.notes = notes;
    return this.hkRepo.save(log);
  }

  async getHousekeepingHistory(
    bedId: string,
    facilityId: string,
  ): Promise<HousekeepingLog[]> {
    return this.hkRepo.find({
      where: { bedId, facilityId },
      order: { startedAt: 'DESC' },
      take: 50,
    });
  }

  async getWardOccupancy(ward: string, facilityId: string) {
    const rooms = await this.roomRepo.find({
      where: { ward, facilityId, isActive: true },
    });
    const roomIds = rooms.map((r) => r.id);
    if (roomIds.length === 0)
      return {
        ward,
        totalBeds: 0,
        occupied: 0,
        available: 0,
        occupancyRate: 0,
      };

    const beds = await this.bedRepo
      .createQueryBuilder('b')
      .where('b.facilityId = :facilityId', { facilityId })
      .andWhere('b.roomId IN (:...roomIds)', { roomIds })
      .andWhere('b.isActive = true')
      .getMany();

    const occupied = beds.filter((b) => b.status === BedStatus.OCCUPIED).length;
    const available = beds.filter(
      (b) => b.status === BedStatus.AVAILABLE,
    ).length;
    const total = beds.length;
    return {
      ward,
      totalBeds: total,
      occupied,
      available,
      cleaning: beds.filter((b) => b.status === BedStatus.CLEANING).length,
      reserved: beds.filter((b) => b.status === BedStatus.RESERVED).length,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
    };
  }

  async getOccupancyDashboard(facilityId: string) {
    const beds = await this.bedRepo.find({
      where: { facilityId, isActive: true },
    });
    const byStatus = Object.values(BedStatus).reduce(
      (acc, s) => {
        acc[s] = beds.filter((b) => b.status === s).length;
        return acc;
      },
      {} as Record<string, number>,
    );

    const rooms = await this.roomRepo.find({
      where: { facilityId, isActive: true },
    });
    const byType = Object.values(RoomType).reduce(
      (acc, t) => {
        const roomIds = rooms.filter((r) => r.type === t).map((r) => r.id);
        acc[t] = {
          rooms: roomIds.length,
          beds: beds.filter((b) => roomIds.includes(b.roomId)).length,
          occupied: beds.filter(
            (b) =>
              roomIds.includes(b.roomId) && b.status === BedStatus.OCCUPIED,
          ).length,
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    const total = beds.length;
    const occupied = byStatus[BedStatus.OCCUPIED] || 0;
    return {
      totalBeds: total,
      byStatus,
      byRoomType: byType,
      overallOccupancyRate:
        total > 0 ? Math.round((occupied / total) * 100) : 0,
    };
  }
}
