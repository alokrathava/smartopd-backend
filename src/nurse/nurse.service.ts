import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vitals } from './entities/vitals.entity';
import { Triage } from './entities/triage.entity';
import { Mar, MarStatus } from './entities/mar.entity';
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
  ) {}

  private computeBmi(weightKg?: number, heightCm?: number): number | undefined {
    if (!weightKg || !heightCm) return undefined;
    const heightM = heightCm / 100;
    return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
  }

  private detectCriticals(dto: CreateVitalsDto): {
    isCritical: boolean;
    flags: string[];
  } {
    const flags: string[] = [];
    if (dto.spO2 !== undefined && dto.spO2 < 94)
      flags.push(`SpO2 low: ${dto.spO2}%`);
    if (dto.systolicBp !== undefined && dto.systolicBp > 180)
      flags.push(`SBP high: ${dto.systolicBp}`);
    if (dto.systolicBp !== undefined && dto.systolicBp < 90)
      flags.push(`SBP low: ${dto.systolicBp}`);
    if (dto.temperatureCelsius !== undefined && dto.temperatureCelsius > 39)
      flags.push(`Temp high: ${dto.temperatureCelsius}°C`);
    if (dto.temperatureCelsius !== undefined && dto.temperatureCelsius < 35)
      flags.push(`Temp low: ${dto.temperatureCelsius}°C`);
    if (dto.pulseBpm !== undefined && dto.pulseBpm > 130)
      flags.push(`Pulse high: ${dto.pulseBpm}`);
    if (dto.pulseBpm !== undefined && dto.pulseBpm < 50)
      flags.push(`Pulse low: ${dto.pulseBpm}`);
    return { isCritical: flags.length > 0, flags };
  }

  async recordVitals(
    dto: CreateVitalsDto,
    facilityId: string,
    userId: string,
  ): Promise<Vitals> {
    const bmi = this.computeBmi(dto.weightKg, dto.heightCm);
    const { isCritical, flags } = this.detectCriticals(dto);

    const vitals = this.vitalsRepo.create({
      ...dto,
      facilityId,
      recordedById: userId,
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
