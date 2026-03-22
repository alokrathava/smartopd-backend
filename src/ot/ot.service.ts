import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { OtBooking, OtStatus, OtUrgency } from './entities/ot-booking.entity';
import { CreateOtBookingDto } from './dto/create-ot-booking.dto';
import { CompleteOtDto } from './dto/complete-ot.dto';
import dayjs from 'dayjs';

@Injectable()
export class OtService {
  constructor(
    @InjectRepository(OtBooking) private readonly otRepo: Repository<OtBooking>,
  ) {}

  /** Create a booking — validates no time-slot conflict in the same OT room */
  async create(dto: CreateOtBookingDto, facilityId: string): Promise<OtBooking> {
    const scheduledStart = new Date(dto.scheduledStart);
    const scheduledEnd = new Date(dto.scheduledEnd);

    if (scheduledEnd <= scheduledStart) {
      throw new BadRequestException('scheduledEnd must be after scheduledStart');
    }

    const conflict = await this.otRepo
      .createQueryBuilder('ot')
      .where('ot.facilityId = :facilityId', { facilityId })
      .andWhere('ot.otRoomId = :otRoomId', { otRoomId: dto.otRoomId })
      .andWhere('ot.status NOT IN (:...done)', {
        done: [OtStatus.CANCELLED, OtStatus.COMPLETED, OtStatus.POSTPONED],
      })
      .andWhere('ot.scheduledStart < :scheduledEnd', { scheduledEnd })
      .andWhere('ot.scheduledEnd > :scheduledStart', { scheduledStart })
      .getOne();

    if (conflict) {
      throw new BadRequestException(
        `OT room already booked: "${conflict.procedureName}" from ${conflict.scheduledStart} to ${conflict.scheduledEnd}`,
      );
    }

    const booking = this.otRepo.create({
      ...dto,
      facilityId,
      scheduledStart,
      scheduledEnd,
    });
    return this.otRepo.save(booking);
  }

  /** Return all booked slots for a given OT room on a date */
  async checkAvailability(otRoomId: string, date: string, facilityId: string) {
    const dayStart = dayjs(date).startOf('day').toDate();
    const dayEnd = dayjs(date).endOf('day').toDate();

    const bookings = await this.otRepo
      .createQueryBuilder('ot')
      .where('ot.facilityId = :facilityId', { facilityId })
      .andWhere('ot.otRoomId = :otRoomId', { otRoomId })
      .andWhere('ot.scheduledStart >= :dayStart', { dayStart })
      .andWhere('ot.scheduledStart <= :dayEnd', { dayEnd })
      .andWhere('ot.status NOT IN (:...done)', {
        done: [OtStatus.CANCELLED, OtStatus.POSTPONED],
      })
      .orderBy('ot.scheduledStart', 'ASC')
      .getMany();

    return bookings.map((b) => ({
      id: b.id,
      scheduledStart: b.scheduledStart,
      scheduledEnd: b.scheduledEnd,
      procedureName: b.procedureName,
      status: b.status,
    }));
  }

  async findAll(
    facilityId: string,
    filters: {
      date?: string;
      surgeonId?: string;
      status?: OtStatus;
      otRoomId?: string;
    },
  ): Promise<OtBooking[]> {
    const qb = this.otRepo
      .createQueryBuilder('ot')
      .where('ot.facilityId = :facilityId', { facilityId })
      .andWhere('ot.deletedAt IS NULL')
      .orderBy('ot.scheduledStart', 'ASC');

    if (filters.date) {
      const dayStart = dayjs(filters.date).startOf('day').toDate();
      const dayEnd = dayjs(filters.date).endOf('day').toDate();
      qb.andWhere('ot.scheduledStart BETWEEN :dayStart AND :dayEnd', { dayStart, dayEnd });
    }
    if (filters.surgeonId) qb.andWhere('ot.surgeonId = :surgeonId', { surgeonId: filters.surgeonId });
    if (filters.status) qb.andWhere('ot.status = :status', { status: filters.status });
    if (filters.otRoomId) qb.andWhere('ot.otRoomId = :otRoomId', { otRoomId: filters.otRoomId });

    return qb.getMany();
  }

  async findOne(id: string, facilityId: string): Promise<OtBooking> {
    const booking = await this.otRepo.findOne({
      where: { id, facilityId, deletedAt: IsNull() },
    });
    if (!booking) throw new NotFoundException(`OT booking ${id} not found`);
    return booking;
  }

  /**
   * Save or update the preOpChecklist JSON.
   * If every item in the checklist has checked === true, set preOpChecklistCompletedAt.
   */
  async updatePreopChecklist(
    id: string,
    checklistData: Record<string, any>,
    facilityId: string,
  ): Promise<OtBooking> {
    const booking = await this.findOne(id, facilityId);
    booking.preOpChecklist = checklistData;

    // Determine if all items are checked
    const items: any[] = Array.isArray(checklistData.items) ? checklistData.items : [];
    const allChecked = items.length > 0 && items.every((item: any) => item.checked === true);
    if (allChecked) {
      booking.preOpChecklistCompletedAt = new Date();
      booking.status = OtStatus.PREOP_CHECK;
    }

    return this.otRepo.save(booking);
  }

  /** Start OT — requires status PREOP_CHECK (preop checklist fully completed) */
  async startOt(id: string, facilityId: string): Promise<OtBooking> {
    const booking = await this.findOne(id, facilityId);

    if (booking.status !== OtStatus.PREOP_CHECK) {
      throw new BadRequestException(
        `Cannot start OT in status "${booking.status}". Pre-op checklist must be completed first (status must be preop_check).`,
      );
    }

    booking.status = OtStatus.IN_PROGRESS;
    booking.actualStart = new Date();
    return this.otRepo.save(booking);
  }

  /** Complete OT — saves notes, sets actualEnd */
  async completeOt(id: string, dto: CompleteOtDto, facilityId: string): Promise<OtBooking> {
    const booking = await this.findOne(id, facilityId);

    if (booking.status !== OtStatus.IN_PROGRESS) {
      throw new BadRequestException('Can only complete an IN_PROGRESS OT booking');
    }

    if (dto.intraOpNotes !== undefined) booking.intraOpNotes = dto.intraOpNotes;
    if (dto.postOpNotes !== undefined) booking.postOpNotes = dto.postOpNotes;
    if (dto.postOpBedId !== undefined) booking.postOpBedId = dto.postOpBedId;

    booking.status = OtStatus.COMPLETED;
    booking.actualEnd = dto.actualEnd ? new Date(dto.actualEnd) : new Date();
    if (!booking.actualStart) booking.actualStart = new Date();

    return this.otRepo.save(booking);
  }

  async cancelBooking(id: string, reason: string, facilityId: string): Promise<OtBooking> {
    const booking = await this.findOne(id, facilityId);

    if ([OtStatus.COMPLETED, OtStatus.CANCELLED].includes(booking.status)) {
      throw new BadRequestException(`Cannot cancel OT in status: ${booking.status}`);
    }

    booking.status = OtStatus.CANCELLED;
    booking.cancelledReason = reason;
    return this.otRepo.save(booking);
  }

  async postponeBooking(
    id: string,
    newTime: { scheduledStart: string; scheduledEnd: string },
    facilityId: string,
  ): Promise<OtBooking> {
    const booking = await this.findOne(id, facilityId);

    if ([OtStatus.COMPLETED, OtStatus.CANCELLED].includes(booking.status)) {
      throw new BadRequestException(`Cannot postpone OT in status: ${booking.status}`);
    }

    booking.status = OtStatus.POSTPONED;
    booking.scheduledStart = new Date(newTime.scheduledStart);
    booking.scheduledEnd = new Date(newTime.scheduledEnd);
    return this.otRepo.save(booking);
  }

  /** Aggregate completed surgeries, avg duration, breakdown by procedure for a surgeon */
  async getSurgeonStats(
    surgeonId: string,
    facilityId: string,
    filters: { from?: string; to?: string },
  ) {
    const qb = this.otRepo
      .createQueryBuilder('ot')
      .where('ot.facilityId = :facilityId', { facilityId })
      .andWhere('ot.surgeonId = :surgeonId', { surgeonId })
      .andWhere('ot.status = :status', { status: OtStatus.COMPLETED });

    if (filters.from) {
      qb.andWhere('ot.scheduledStart >= :from', { from: new Date(filters.from) });
    }
    if (filters.to) {
      qb.andWhere('ot.scheduledStart <= :to', {
        to: dayjs(filters.to).endOf('day').toDate(),
      });
    }

    const completed = await qb.getMany();

    // Average duration in minutes
    const durationsMinutes = completed
      .filter((b) => b.actualStart && b.actualEnd)
      .map((b) =>
        dayjs(b.actualEnd!).diff(dayjs(b.actualStart!), 'minute'),
      );

    const avgDuration =
      durationsMinutes.length > 0
        ? Math.round(durationsMinutes.reduce((a, b) => a + b, 0) / durationsMinutes.length)
        : 0;

    // Breakdown by procedure name
    const byProcedure: Record<string, number> = {};
    for (const b of completed) {
      byProcedure[b.procedureName] = (byProcedure[b.procedureName] || 0) + 1;
    }

    return {
      surgeonId,
      totalCompleted: completed.length,
      avgDurationMinutes: avgDuration,
      byProcedure,
    };
  }
}
