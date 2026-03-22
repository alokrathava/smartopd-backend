import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Visit, VisitStatus } from './entities/visit.entity';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitStatusDto } from './dto/update-visit-status.dto';

@Injectable()
export class VisitsService {
  constructor(
    @InjectRepository(Visit)
    private readonly visitRepo: Repository<Visit>,
  ) {}

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  }

  private async generateVisitNumber(facilityId: string): Promise<string> {
    const dateStr = this.formatDate(new Date());
    const prefix = `VISIT-${dateStr}-`;

    const last = await this.visitRepo
      .createQueryBuilder('v')
      .where('v.facilityId = :facilityId', { facilityId })
      .andWhere('v.visitNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('v.visitNumber', 'DESC')
      .getOne();

    let seq = 1;
    if (last?.visitNumber) {
      const parts = last.visitNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  private async getDailyToken(facilityId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const count = await this.visitRepo
      .createQueryBuilder('v')
      .where('v.facilityId = :facilityId', { facilityId })
      .andWhere('v.checkedInAt >= :startOfDay', { startOfDay })
      .getCount();

    return count + 1;
  }

  async create(
    dto: CreateVisitDto,
    facilityId: string,
    userId: string,
  ): Promise<Visit> {
    const visitNumber = await this.generateVisitNumber(facilityId);
    const tokenNumber = await this.getDailyToken(facilityId);

    const visit = this.visitRepo.create({
      ...dto,
      facilityId,
      registeredById: userId,
      visitNumber,
      tokenNumber,
      checkedInAt: new Date(),
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });

    return this.visitRepo.save(visit);
  }

  async findAll(
    facilityId: string,
    filters: {
      date?: string;
      doctorId?: string;
      status?: VisitStatus;
      patientId?: string;
    },
  ) {
    const qb = this.visitRepo
      .createQueryBuilder('v')
      .where('v.facilityId = :facilityId', { facilityId })
      .andWhere('v.deletedAt IS NULL')
      .orderBy('v.tokenNumber', 'ASC');

    if (filters.date) {
      const d = new Date(filters.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      qb.andWhere('v.checkedInAt >= :d AND v.checkedInAt < :next', { d, next });
    }
    if (filters.doctorId)
      qb.andWhere('v.doctorId = :doctorId', { doctorId: filters.doctorId });
    if (filters.status)
      qb.andWhere('v.status = :status', { status: filters.status });
    if (filters.patientId)
      qb.andWhere('v.patientId = :patientId', { patientId: filters.patientId });

    return qb.getMany();
  }

  async findOne(id: string, facilityId: string): Promise<Visit> {
    const visit = await this.visitRepo.findOne({
      where: { id, facilityId, deletedAt: IsNull() },
    });
    if (!visit) throw new NotFoundException(`Visit ${id} not found`);
    return visit;
  }

  async updateStatus(
    id: string,
    dto: UpdateVisitStatusDto,
    facilityId: string,
  ): Promise<Visit> {
    const visit = await this.findOne(id, facilityId);
    visit.status = dto.status;

    const now = new Date();
    switch (dto.status) {
      case VisitStatus.WITH_NURSE:
        visit.nurseSeenAt = now;
        break;
      case VisitStatus.WITH_DOCTOR:
        visit.doctorSeenAt = now;
        break;
      case VisitStatus.COMPLETED:
        visit.completedAt = now;
        break;
    }

    if (dto.notes) visit.visitNotes = dto.notes;
    return this.visitRepo.save(visit);
  }

  async getQueue(facilityId: string, doctorId?: string) {
    const qb = this.visitRepo
      .createQueryBuilder('v')
      .where('v.facilityId = :facilityId', { facilityId })
      .andWhere('v.status NOT IN (:...done)', {
        done: [
          VisitStatus.COMPLETED,
          VisitStatus.CANCELLED,
          VisitStatus.NO_SHOW,
        ],
      })
      .andWhere('v.deletedAt IS NULL')
      .orderBy('v.tokenNumber', 'ASC');

    if (doctorId) qb.andWhere('v.doctorId = :doctorId', { doctorId });

    return qb.getMany();
  }

  async getDailyQueue(facilityId: string, date: string) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    return this.visitRepo
      .createQueryBuilder('v')
      .where('v.facilityId = :facilityId', { facilityId })
      .andWhere('v.checkedInAt >= :d AND v.checkedInAt < :next', { d, next })
      .andWhere('v.deletedAt IS NULL')
      .orderBy('v.tokenNumber', 'ASC')
      .getMany();
  }

  async getPatientVisits(
    patientId: string,
    facilityId: string,
  ): Promise<Visit[]> {
    return this.visitRepo.find({
      where: { patientId, facilityId },
      order: { checkedInAt: 'DESC' },
    });
  }

  async cancel(id: string, facilityId: string): Promise<Visit> {
    const visit = await this.findOne(id, facilityId);
    visit.status = VisitStatus.CANCELLED;
    return this.visitRepo.save(visit);
  }

  async assignDoctor(
    id: string,
    doctorId: string,
    facilityId: string,
  ): Promise<Visit> {
    const visit = await this.findOne(id, facilityId);
    visit.doctorId = doctorId;
    if (
      visit.status === VisitStatus.REGISTERED ||
      visit.status === VisitStatus.WAITING
    ) {
      visit.status = VisitStatus.WAITING;
    }
    return this.visitRepo.save(visit);
  }

  async startTriage(id: string, facilityId: string): Promise<Visit> {
    const visit = await this.findOne(id, facilityId);
    visit.status = VisitStatus.WITH_NURSE;
    visit.nurseSeenAt = new Date();
    return this.visitRepo.save(visit);
  }

  async startConsultation(id: string, facilityId: string): Promise<Visit> {
    const visit = await this.findOne(id, facilityId);
    visit.status = VisitStatus.WITH_DOCTOR;
    visit.doctorSeenAt = new Date();
    return this.visitRepo.save(visit);
  }

  async completeVisit(id: string, facilityId: string): Promise<Visit> {
    const visit = await this.findOne(id, facilityId);
    visit.status = VisitStatus.COMPLETED;
    visit.completedAt = new Date();
    return this.visitRepo.save(visit);
  }

  async markNoShow(id: string, facilityId: string): Promise<Visit> {
    const visit = await this.findOne(id, facilityId);
    visit.status = VisitStatus.NO_SHOW;
    return this.visitRepo.save(visit);
  }
}
