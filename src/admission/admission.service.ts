import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
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

// ─── Inline DTOs ──────────────────────────────────────────────────────────────

export class CreateAdmissionDto {
  patientId: string;
  sourceVisitId?: string;
  admittingDoctorId: string;
  primaryNurseId?: string;
  bedId: string;
  wardId: string;
  admissionType: AdmissionType;
  chiefComplaint: string;
  icd10Codes?: string[];
  nhcxPreAuthId?: string;
  nhcxPreAuthStatus?: string;
  nhcxApprovedAmount?: number;
  attendantName?: string;
  attendantPhone?: string;
  wristbandNumber?: string;
  expectedDischargeDate?: string;
}

export class TransferBedDto {
  newBedId: string;
  newWardId?: string;
  reason?: string;
}

export class WardIntakeDto {
  primaryNurseId: string;
}

export class NursingNoteDto {
  note: string;
  patientId: string;
  bedId: string;
}

export class WardRoundStopDto {
  admissionId: string;
  bedId: string;
  patientId: string;
  stopOrder?: number;
  subjectiveNotes?: string;
  objectiveNotes?: string;
  assessmentNotes?: string;
  planNotes?: string;
  vitalSummary?: Record<string, unknown>;
  flagged?: boolean;
  flagReason?: string;
}

export class CreateWardRoundDto {
  wardId?: string;
  notes?: string;
  stops: WardRoundStopDto[];
}

export class InitiateDischargeDto {
  dischargeType?: DischargeType;
  dischargeNotes?: string;
  expectedDischargeDate?: string;
}

export class CompleteDischargeDto {
  dischargeType: DischargeType;
  dischargeNotes?: string;
}

export class DamaDto {
  reason?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AdmissionService {
  constructor(
    @InjectRepository(Admission)
    private readonly admissionRepo: Repository<Admission>,
    @InjectRepository(WardRound)
    private readonly wardRoundRepo: Repository<WardRound>,
    @InjectRepository(WardRoundStop)
    private readonly wardRoundStopRepo: Repository<WardRoundStop>,
    @InjectRepository(DischargeSummary)
    private readonly summaryRepo: Repository<DischargeSummary>,
    @InjectRepository(Bed)
    private readonly bedRepo: Repository<Bed>,
  ) {}

  // ── Admission number generation ────────────────────────────────────────────

  private async generateAdmissionNumber(facilityId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ADM-${year}-`;
    const count = await this.admissionRepo
      .createQueryBuilder('a')
      .where('a.facilityId = :facilityId', { facilityId })
      .andWhere('a.admissionNumber LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();
    const seq = String(count + 1).padStart(5, '0');
    return `${prefix}${seq}`;
  }

  // ── Create admission ───────────────────────────────────────────────────────

  async create(
    dto: CreateAdmissionDto,
    facilityId: string,
    userId: string,
  ): Promise<Admission> {
    const bed = await this.bedRepo.findOne({ where: { id: dto.bedId } });
    if (!bed) throw new NotFoundException(`Bed ${dto.bedId} not found`);
    if (bed.status !== BedStatus.AVAILABLE) {
      throw new BadRequestException(
        `Bed ${dto.bedId} is not AVAILABLE (current status: ${bed.status})`,
      );
    }

    const admissionNumber = await this.generateAdmissionNumber(facilityId);

    const admission = this.admissionRepo.create({
      ...dto,
      facilityId,
      admissionNumber,
      status: AdmissionStatus.ACTIVE,
      admittedAt: new Date(),
    });
    await this.admissionRepo.save(admission);

    bed.status = BedStatus.OCCUPIED;
    bed.currentPatientId = dto.patientId;
    bed.currentAdmissionId = admission.id;
    await this.bedRepo.save(bed);

    return admission;
  }

  // ── Find all (with filters) ────────────────────────────────────────────────

  async findAll(
    facilityId: string,
    filters: {
      status?: AdmissionStatus;
      wardId?: string;
      doctorId?: string;
      date?: string;
    },
  ): Promise<Admission[]> {
    const qb = this.admissionRepo
      .createQueryBuilder('a')
      .where('a.facilityId = :facilityId', { facilityId })
      .andWhere('a.deletedAt IS NULL')
      .orderBy('a.admittedAt', 'DESC');

    if (filters.status)
      qb.andWhere('a.status = :status', { status: filters.status });
    if (filters.wardId)
      qb.andWhere('a.wardId = :wardId', { wardId: filters.wardId });
    if (filters.doctorId)
      qb.andWhere('a.admittingDoctorId = :doctorId', {
        doctorId: filters.doctorId,
      });
    if (filters.date) {
      qb.andWhere('DATE(a.admittedAt) = :date', { date: filters.date });
    }

    return qb.getMany();
  }

  // ── Find one ───────────────────────────────────────────────────────────────

  async findOne(id: string, facilityId: string): Promise<Admission> {
    const a = await this.admissionRepo.findOne({
      where: { id, facilityId, deletedAt: IsNull() },
    });
    if (!a) throw new NotFoundException(`Admission ${id} not found`);
    return a;
  }

  // ── Transfer bed ───────────────────────────────────────────────────────────

  async transfer(
    id: string,
    dto: TransferBedDto,
    facilityId: string,
  ): Promise<Admission> {
    const admission = await this.findOne(id, facilityId);
    if (
      ![AdmissionStatus.ACTIVE, AdmissionStatus.DISCHARGE_PLANNED].includes(
        admission.status,
      )
    ) {
      throw new BadRequestException(
        'Can only transfer an ACTIVE or DISCHARGE_PLANNED admission',
      );
    }

    const newBed = await this.bedRepo.findOne({ where: { id: dto.newBedId } });
    if (!newBed) throw new NotFoundException(`Bed ${dto.newBedId} not found`);
    if (newBed.status !== BedStatus.AVAILABLE) {
      throw new BadRequestException(`Bed ${dto.newBedId} is not AVAILABLE`);
    }

    // Free old bed
    const oldBed = await this.bedRepo.findOne({
      where: { id: admission.bedId },
    });
    if (oldBed) {
      oldBed.status = BedStatus.AVAILABLE;
      oldBed.lastOccupiedBy = admission.patientId;
      oldBed.currentPatientId = undefined;
      oldBed.currentAdmissionId = undefined;
      await this.bedRepo.save(oldBed);
    }

    // Occupy new bed
    newBed.status = BedStatus.OCCUPIED;
    newBed.currentPatientId = admission.patientId;
    newBed.currentAdmissionId = admission.id;
    await this.bedRepo.save(newBed);

    admission.bedId = dto.newBedId;
    if (dto.newWardId) admission.wardId = dto.newWardId;
    return this.admissionRepo.save(admission);
  }

  // ── Ward intake ────────────────────────────────────────────────────────────

  async wardIntake(
    id: string,
    dto: WardIntakeDto,
    facilityId: string,
  ): Promise<Admission> {
    const admission = await this.findOne(id, facilityId);
    if (admission.status !== AdmissionStatus.ACTIVE) {
      throw new BadRequestException(
        'Ward intake is only for ACTIVE admissions',
      );
    }
    admission.primaryNurseId = dto.primaryNurseId;
    return this.admissionRepo.save(admission);
  }

  // ── Add nursing note ───────────────────────────────────────────────────────

  async addNursingNote(
    id: string,
    dto: NursingNoteDto,
    facilityId: string,
  ): Promise<WardRoundStop> {
    const admission = await this.findOne(id, facilityId);

    // Create a lightweight ward round session for this nursing note
    const round = this.wardRoundRepo.create({
      facilityId,
      admissionId: id,
      conductedById: admission.primaryNurseId ?? '',
      conductedAt: new Date(),
      wardId: admission.wardId,
      notes: 'Nursing Note',
    });
    await this.wardRoundRepo.save(round);

    const stop = this.wardRoundStopRepo.create({
      facilityId,
      wardRoundId: round.id,
      admissionId: id,
      bedId: dto.bedId || admission.bedId,
      patientId: dto.patientId || admission.patientId,
      stopOrder: 1,
      subjectiveNotes: dto.note,
      conductedAt: new Date(),
    });
    return this.wardRoundStopRepo.save(stop);
  }

  // ── Create ward round ──────────────────────────────────────────────────────

  async createWardRound(
    admissionId: string,
    dto: CreateWardRoundDto,
    facilityId: string,
    userId: string,
  ): Promise<WardRound> {
    await this.findOne(admissionId, facilityId);

    const round = this.wardRoundRepo.create({
      facilityId,
      admissionId,
      conductedById: userId,
      conductedAt: new Date(),
      wardId: dto.wardId,
      notes: dto.notes,
    });
    await this.wardRoundRepo.save(round);

    if (dto.stops && dto.stops.length > 0) {
      const stops = dto.stops.map((s, idx) =>
        this.wardRoundStopRepo.create({
          facilityId,
          wardRoundId: round.id,
          admissionId: s.admissionId || admissionId,
          bedId: s.bedId,
          patientId: s.patientId,
          stopOrder: s.stopOrder ?? idx + 1,
          subjectiveNotes: s.subjectiveNotes,
          objectiveNotes: s.objectiveNotes,
          assessmentNotes: s.assessmentNotes,
          planNotes: s.planNotes,
          vitalSummary: s.vitalSummary,
          flagged: s.flagged ?? false,
          flagReason: s.flagReason,
          conductedAt: new Date(),
        }),
      );
      await this.wardRoundStopRepo.save(stops);
    }

    return round;
  }

  // ── Initiate discharge ─────────────────────────────────────────────────────

  async initiateDischarge(
    id: string,
    dto: InitiateDischargeDto,
    facilityId: string,
  ): Promise<Admission> {
    const admission = await this.findOne(id, facilityId);
    if (admission.status !== AdmissionStatus.ACTIVE) {
      throw new BadRequestException(
        'Can only initiate discharge for an ACTIVE admission',
      );
    }
    admission.status = AdmissionStatus.DISCHARGE_PLANNED;
    admission.dischargeInitiatedAt = new Date();
    if (dto.dischargeType) admission.dischargeType = dto.dischargeType;
    if (dto.dischargeNotes) admission.dischargeNotes = dto.dischargeNotes;
    if (dto.expectedDischargeDate)
      admission.expectedDischargeDate = dto.expectedDischargeDate;
    return this.admissionRepo.save(admission);
  }

  // ── Complete discharge ─────────────────────────────────────────────────────

  async completeDischarge(
    id: string,
    dto: CompleteDischargeDto,
    facilityId: string,
  ): Promise<Admission> {
    const admission = await this.findOne(id, facilityId);
    if (
      !(
        [
          AdmissionStatus.DISCHARGE_PLANNED,
          AdmissionStatus.ACTIVE,
        ] as AdmissionStatus[]
      ).includes(admission.status)
    ) {
      throw new BadRequestException(
        'Admission is not in a dischargeable state',
      );
    }

    admission.status = AdmissionStatus.DISCHARGED;
    admission.dischargedAt = new Date();
    admission.dischargeType = dto.dischargeType;
    if (dto.dischargeNotes) admission.dischargeNotes = dto.dischargeNotes;

    await this.freeBed(admission);
    return this.admissionRepo.save(admission);
  }

  // ── DAMA ───────────────────────────────────────────────────────────────────

  async dama(id: string, dto: DamaDto, facilityId: string): Promise<Admission> {
    const admission = await this.findOne(id, facilityId);
    if (
      ![AdmissionStatus.ACTIVE, AdmissionStatus.DISCHARGE_PLANNED].includes(
        admission.status,
      )
    ) {
      throw new BadRequestException(
        'Can only DAMA an ACTIVE or DISCHARGE_PLANNED admission',
      );
    }

    admission.status = AdmissionStatus.DAMA;
    admission.dischargedAt = new Date();
    admission.dischargeType = DischargeType.DAMA;
    if (dto.reason) admission.dischargeNotes = dto.reason;

    await this.freeBed(admission);
    return this.admissionRepo.save(admission);
  }

  // ── Get timeline ───────────────────────────────────────────────────────────

  async getTimeline(
    id: string,
    facilityId: string,
  ): Promise<{ rounds: WardRound[]; stops: WardRoundStop[] }> {
    await this.findOne(id, facilityId);

    const rounds = await this.wardRoundRepo.find({
      where: { admissionId: id, facilityId },
      order: { conductedAt: 'ASC' },
    });

    const stops = await this.wardRoundStopRepo.find({
      where: { admissionId: id, facilityId },
      order: { conductedAt: 'ASC' },
    });

    return { rounds, stops };
  }

  // ── Get discharge summary ──────────────────────────────────────────────────

  async getDischargeSummary(
    id: string,
    facilityId: string,
  ): Promise<DischargeSummary | null> {
    await this.findOne(id, facilityId);
    return this.summaryRepo.findOne({ where: { admissionId: id, facilityId } });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async freeBed(admission: Admission): Promise<void> {
    const bed = await this.bedRepo.findOne({ where: { id: admission.bedId } });
    if (bed) {
      bed.status = BedStatus.AVAILABLE;
      bed.lastOccupiedBy = admission.patientId;
      bed.currentPatientId = undefined;
      bed.currentAdmissionId = undefined;
      await this.bedRepo.save(bed);
    }
  }
}
