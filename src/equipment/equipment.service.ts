import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Equipment, EquipmentStatus } from './entities/equipment.entity';
import { EquipmentLease, PatientLeaseStatus } from './entities/equipment-lease.entity';
import { MaintenanceLog } from './entities/maintenance-log.entity';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { CreatePatientLeaseDto } from './dto/create-patient-lease.dto';
import { ReturnEquipmentDto } from './dto/return-equipment.dto';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';

@Injectable()
export class EquipmentService {
  constructor(
    @InjectRepository(Equipment)
    private readonly equipmentRepo: Repository<Equipment>,
    @InjectRepository(EquipmentLease)
    private readonly leaseRepo: Repository<EquipmentLease>,
    @InjectRepository(MaintenanceLog)
    private readonly maintenanceRepo: Repository<MaintenanceLog>,
  ) {}

  async create(dto: CreateEquipmentDto, facilityId: string): Promise<Equipment> {
    const eq = this.equipmentRepo.create({
      ...dto,
      facilityId,
      purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      warrantyExpiresAt: dto.warrantyExpiresAt ? new Date(dto.warrantyExpiresAt) : undefined,
      nextMaintenanceDue: dto.nextMaintenanceDue ? new Date(dto.nextMaintenanceDue) : undefined,
    });
    return this.equipmentRepo.save(eq);
  }

  async findAll(facilityId: string, filters?: { status?: EquipmentStatus; category?: string }) {
    const qb = this.equipmentRepo
      .createQueryBuilder('e')
      .where('e.facilityId = :facilityId', { facilityId })
      .orderBy('e.name', 'ASC');

    if (filters?.status) qb.andWhere('e.status = :status', { status: filters.status });
    if (filters?.category) qb.andWhere('e.category = :category', { category: filters.category });

    return qb.getMany();
  }

  async findOne(id: string, facilityId: string): Promise<Equipment> {
    const eq = await this.equipmentRepo.findOne({ where: { id, facilityId } });
    if (!eq) throw new NotFoundException(`Equipment ${id} not found`);
    return eq;
  }

  async update(id: string, dto: Partial<CreateEquipmentDto>, facilityId: string): Promise<Equipment> {
    const eq = await this.findOne(id, facilityId);
    Object.assign(eq, dto);
    if (dto.purchaseDate) eq.purchaseDate = new Date(dto.purchaseDate);
    if (dto.warrantyExpiresAt) eq.warrantyExpiresAt = new Date(dto.warrantyExpiresAt);
    if (dto.nextMaintenanceDue) eq.nextMaintenanceDue = new Date(dto.nextMaintenanceDue);
    return this.equipmentRepo.save(eq);
  }

  async issueToPatient(dto: CreatePatientLeaseDto, facilityId: string, userId: string): Promise<EquipmentLease> {
    const eq = await this.findOne(dto.equipmentId, facilityId);
    eq.status = EquipmentStatus.LEASED_OUT;
    await this.equipmentRepo.save(eq);

    const lease = this.leaseRepo.create({
      ...dto,
      facilityId,
      issuedById: userId,
      issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : new Date(),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(),
    });
    return this.leaseRepo.save(lease);
  }

  async returnFromPatient(leaseId: string, dto: ReturnEquipmentDto, facilityId: string): Promise<EquipmentLease> {
    const lease = await this.leaseRepo.findOne({ where: { id: leaseId, facilityId } });
    if (!lease) throw new NotFoundException(`Lease ${leaseId} not found`);

    lease.returnedAt = new Date();
    lease.returnedCondition = dto.returnedCondition;
    lease.status = PatientLeaseStatus.RETURNED;
    if (dto.notes) lease.notes = dto.notes;

    const eq = await this.equipmentRepo.findOne({ where: { id: lease.equipmentId } });
    if (eq) {
      eq.status = EquipmentStatus.AVAILABLE;
      await this.equipmentRepo.save(eq);
    }

    return this.leaseRepo.save(lease);
  }

  async getActiveLeases(facilityId: string): Promise<EquipmentLease[]> {
    return this.leaseRepo.find({
      where: { facilityId, status: PatientLeaseStatus.ACTIVE },
      order: { dueDate: 'ASC' },
    });
  }

  async getOverdueLeases(facilityId: string): Promise<EquipmentLease[]> {
    return this.leaseRepo
      .createQueryBuilder('l')
      .where('l.facilityId = :facilityId', { facilityId })
      .andWhere('l.status = :status', { status: PatientLeaseStatus.ACTIVE })
      .andWhere('l.dueDate < :now', { now: new Date() })
      .orderBy('l.dueDate', 'ASC')
      .getMany();
  }

  async createMaintenanceLog(dto: CreateMaintenanceLogDto, facilityId: string): Promise<MaintenanceLog> {
    const log = this.maintenanceRepo.create({
      ...dto,
      facilityId,
      scheduledDate: new Date(dto.scheduledDate),
      performedDate: dto.performedDate ? new Date(dto.performedDate) : undefined,
      nextDueDate: dto.nextDueDate ? new Date(dto.nextDueDate) : undefined,
    });
    return this.maintenanceRepo.save(log);
  }

  async getMaintenanceDue(facilityId: string): Promise<Equipment[]> {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + 30);

    return this.equipmentRepo
      .createQueryBuilder('e')
      .where('e.facilityId = :facilityId', { facilityId })
      .andWhere('e.nextMaintenanceDue <= :threshold', { threshold })
      .orderBy('e.nextMaintenanceDue', 'ASC')
      .getMany();
  }

  async findByQr(qrCode: string): Promise<Equipment> {
    const eq = await this.equipmentRepo.findOne({ where: { qrCode } });
    if (!eq) throw new NotFoundException(`Equipment with QR code ${qrCode} not found`);
    return eq;
  }
}
