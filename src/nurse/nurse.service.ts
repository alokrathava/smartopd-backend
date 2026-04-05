import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vitals } from './entities/vitals.entity';
import { Triage } from './entities/triage.entity';
import { Mar, MarStatus } from './entities/mar.entity';
import { Visit } from '../visits/entities/visit.entity';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { CreateTriageDto } from './dto/create-triage.dto';
import { CreateMarDto } from './dto/create-mar.dto';

@Injectable()
export class NurseService {
  constructor(
    @InjectRepository(Vitals)
    private readonly vitalsRepo: Repository<Vitals>,
    @InjectRepository(Triage)
    private readonly triageRepo: Repository<Triage>,
    @InjectRepository(Mar)
    private readonly marRepo: Repository<Mar>,
    @InjectRepository(Visit)
    private readonly visitRepo: Repository<Visit>,
  ) {}

  private computeBmi(weight?: number, height?: number): number | undefined {
    if (!weight || !height) return undefined;
    const heightM = height / 100;
    return Math.round((weight / (heightM * heightM)) * 100) / 100;
  }

  private detectCriticals(dto: CreateVitalsDto): {
    isCritical: boolean;
    flags: string[];
  } {
    const flags: string[] = [];
    if (dto.spO2 !== undefined && dto.spO2 < 94)
      flags.push(`SpO2 low: ${dto.spO2}%`);
    if (dto.systolic !== undefined && dto.systolic > 180)
      flags.push(`SBP high: ${dto.systolic}`);
    if (dto.systolic !== undefined && dto.systolic < 90)
      flags.push(`SBP low: ${dto.systolic}`);
    if (dto.temperature !== undefined && dto.temperature > 39)
      flags.push(`Temp high: ${dto.temperature}°C`);
    if (dto.temperature !== undefined && dto.temperature < 35)
      flags.push(`Temp low: ${dto.temperature}°C`);
    if (dto.pulse !== undefined && dto.pulse > 130)
      flags.push(`Pulse high: ${dto.pulse}`);
    if (dto.pulse !== undefined && dto.pulse < 50)
      flags.push(`Pulse low: ${dto.pulse}`);
    return { isCritical: flags.length > 0, flags };
  }

  async recordVitals(
    dto: CreateVitalsDto,
    facilityId: string,
    userId: string,
  ): Promise<Vitals> {
    const visit = await this.visitRepo.findOne({
      where: { id: dto.visitId, facilityId },
    });
    if (!visit) throw new NotFoundException(`Visit ${dto.visitId} not found`);

    const bmi = this.computeBmi(dto.weight, dto.height);
    const { isCritical, flags } = this.detectCriticals(dto);

    const vitals = this.vitalsRepo.create({
      visitId: dto.visitId,
      patientId: dto.patientId,
      facilityId,
      recordedById: userId,
      temperatureCelsius: dto.temperature,
      temperatureSite: dto.temperatureSite,
      pulseBpm: dto.pulse,
      respiratoryRate: dto.respiration,
      systolicBp: dto.systolic,
      diastolicBp: dto.diastolic,
      spO2: dto.spO2,
      heightCm: dto.height,
      weightKg: dto.weight,
      painScore: dto.painScore,
      bloodGlucose: dto.bloodGlucose,
      notes: dto.notes,
      bmi,
      isCritical,
      criticalFlags: flags.length > 0 ? JSON.stringify(flags) : undefined,
      recordedAt: new Date(),
    });

    return this.vitalsRepo.save(vitals);
  }

  async getVitals(visitId: string, facilityId: string): Promise<Vitals[]> {
    return this.vitalsRepo.find({
      where: { visitId, facilityId },
      order: { recordedAt: 'DESC' },
    });
  }

  async createTriage(
    dto: CreateTriageDto,
    facilityId: string,
    userId: string,
  ): Promise<Triage> {
    const visit = await this.visitRepo.findOne({
      where: { id: dto.visitId, facilityId },
    });
    if (!visit) throw new NotFoundException(`Visit ${dto.visitId} not found`);

    const triage = this.triageRepo.create({
      ...dto,
      facilityId,
      triageById: userId,
      triageAt: new Date(),
    });
    return this.triageRepo.save(triage);
  }

  async getTriage(visitId: string, facilityId: string): Promise<Triage> {
    const triage = await this.triageRepo.findOne({
      where: { visitId, facilityId },
    });
    if (!triage)
      throw new NotFoundException(`Triage for visit ${visitId} not found`);
    return triage;
  }

  async createMar(
    dto: CreateMarDto,
    facilityId: string,
    userId: string,
  ): Promise<Mar> {
    const mar = this.marRepo.create({
      ...dto,
      facilityId,
      administeredById: userId,
      scheduledAt: new Date(dto.scheduledAt),
    });
    return this.marRepo.save(mar);
  }

  async updateMarStatus(
    id: string,
    status: MarStatus,
    facilityId: string,
    holdReason?: string,
  ): Promise<Mar> {
    const mar = await this.marRepo.findOne({ where: { id, facilityId } });
    if (!mar) throw new NotFoundException(`MAR record ${id} not found`);
    mar.status = status;
    if (status === MarStatus.ADMINISTERED) mar.administeredAt = new Date();
    if (holdReason) mar.holdReason = holdReason;
    return this.marRepo.save(mar);
  }

  async getMarByVisit(visitId: string, facilityId: string): Promise<Mar[]> {
    return this.marRepo.find({
      where: { visitId, facilityId },
      order: { scheduledAt: 'ASC' },
    });
  }
}
