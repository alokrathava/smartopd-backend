import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { DispenseRecord } from './entities/dispense-record.entity';
import { PharmacyInventory } from './entities/pharmacy-inventory.entity';
import { DispenseDto } from './dto/dispense.dto';
import { CreateInventoryDto } from './dto/create-inventory.dto';

@Injectable()
export class PharmacyService {
  constructor(
    @InjectRepository(DispenseRecord)
    private readonly dispenseRepo: Repository<DispenseRecord>,
    @InjectRepository(PharmacyInventory)
    private readonly inventoryRepo: Repository<PharmacyInventory>,
  ) {}

  async getDispenseQueue(facilityId: string) {
    // Returns prescriptions that are finalized but not fully dispensed
    // This is a simplified implementation
    return this.dispenseRepo
      .createQueryBuilder('d')
      .where('d.facilityId = :facilityId', { facilityId })
      .orderBy('d.dispensedAt', 'DESC')
      .getMany();
  }

  async dispense(
    dto: DispenseDto,
    facilityId: string,
    pharmacistId: string,
  ): Promise<DispenseRecord> {
    const totalPrice =
      dto.unitPrice && dto.quantityDispensed
        ? dto.unitPrice * dto.quantityDispensed
        : undefined;

    const record = this.dispenseRepo.create({
      ...dto,
      facilityId,
      dispensedById: pharmacistId,
      dispensedAt: new Date(),
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      otpVerifiedAt: dto.otpVerified ? new Date() : undefined,
      totalPrice,
    });
    return this.dispenseRepo.save(record);
  }

  async checkAllergy(
    patientId: string,
    drugName: string,
    facilityId: string,
  ): Promise<{ hasAllergy: boolean; matchedAllergens: string[] }> {
    // Simplified: this would typically look up patient allergies
    // and do a string match against drug name
    return {
      hasAllergy: false,
      matchedAllergens: [],
    };
  }

  async getInventory(
    facilityId: string,
    filters?: { drugName?: string },
  ): Promise<PharmacyInventory[]> {
    const qb = this.inventoryRepo
      .createQueryBuilder('i')
      .where('i.facilityId = :facilityId', { facilityId })
      .andWhere('i.isActive = true')
      .orderBy('i.drugName', 'ASC');

    if (filters?.drugName) {
      qb.andWhere('i.drugName LIKE :name', { name: `%${filters.drugName}%` });
    }

    return qb.getMany();
  }

  async addInventory(
    dto: CreateInventoryDto,
    facilityId: string,
  ): Promise<PharmacyInventory> {
    const item = this.inventoryRepo.create({
      ...dto,
      facilityId,
      expiryDate: new Date(dto.expiryDate),
    });
    return this.inventoryRepo.save(item);
  }

  async getLowStock(facilityId: string): Promise<PharmacyInventory[]> {
    return this.inventoryRepo
      .createQueryBuilder('i')
      .where('i.facilityId = :facilityId', { facilityId })
      .andWhere('i.quantityInStock <= i.reorderLevel')
      .andWhere('i.isActive = true')
      .orderBy('i.quantityInStock', 'ASC')
      .getMany();
  }

  async getExpiringStock(
    facilityId: string,
    days = 30,
  ): Promise<PharmacyInventory[]> {
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + days);

    return this.inventoryRepo.find({
      where: {
        facilityId,
        isActive: true,
        expiryDate: LessThanOrEqual(expiryThreshold),
      },
      order: { expiryDate: 'ASC' },
    });
  }

  async getDispenseHistory(
    facilityId: string,
    filters?: { patientId?: string; prescriptionId?: string },
  ) {
    const qb = this.dispenseRepo
      .createQueryBuilder('d')
      .where('d.facilityId = :facilityId', { facilityId })
      .orderBy('d.dispensedAt', 'DESC');

    if (filters?.patientId)
      qb.andWhere('d.patientId = :patientId', { patientId: filters.patientId });
    if (filters?.prescriptionId)
      qb.andWhere('d.prescriptionId = :prescriptionId', {
        prescriptionId: filters.prescriptionId,
      });

    return qb.getMany();
  }
}
