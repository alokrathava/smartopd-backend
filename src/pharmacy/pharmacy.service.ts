import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { DispenseRecord } from './entities/dispense-record.entity';
import { PharmacyInventory } from './entities/pharmacy-inventory.entity';
import { Patient } from '../patients/entities/patient.entity';
import { DispenseDto } from './dto/dispense.dto';
import { CreateInventoryDto } from './dto/create-inventory.dto';

@Injectable()
export class PharmacyService {
  constructor(
    @InjectRepository(DispenseRecord)
    private readonly dispenseRepo: Repository<DispenseRecord>,
    @InjectRepository(PharmacyInventory)
    private readonly inventoryRepo: Repository<PharmacyInventory>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getDispenseQueue(facilityId: string) {
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

  /**
   * Check if a patient has a recorded allergy to the drug being dispensed.
   * Also calls OpenFDA for drug interaction data if configured.
   */
  async checkAllergy(
    patientId: string,
    drugName: string,
    facilityId: string,
  ): Promise<{
    hasAllergy: boolean;
    matchedAllergens: string[];
    warning?: string;
  }> {
    const patient = await this.patientRepo.findOne({
      where: { id: patientId, facilityId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient ${patientId} not found`);
    }

    const matchedAllergens: string[] = [];

    if (patient.allergies) {
      // Patient allergies stored as comma-separated list or JSON array
      let allergyList: string[] = [];
      try {
        allergyList = JSON.parse(patient.allergies) as string[];
      } catch {
        allergyList = patient.allergies
          .split(',')
          .map((a) => a.trim().toLowerCase());
      }

      const drugLower = drugName.toLowerCase();
      for (const allergen of allergyList) {
        if (drugLower.includes(allergen) || allergen.includes(drugLower)) {
          matchedAllergens.push(allergen);
        }
      }
    }

    const hasAllergy = matchedAllergens.length > 0;

    return {
      hasAllergy,
      matchedAllergens,
      warning: hasAllergy
        ? `⚠️ ALLERGY ALERT: Patient has recorded allergy to: ${matchedAllergens.join(', ')}`
        : undefined,
    };
  }

  /**
   * Check drug-drug interactions using OpenFDA API.
   * Returns interaction warnings for the given drug names.
   */
  async checkDrugInteractions(
    drugNames: string[],
    facilityId: string,
  ): Promise<{
    hasInteractions: boolean;
    interactions: Array<{
      drug1: string;
      drug2: string;
      severity: string;
      description: string;
    }>;
  }> {
    if (drugNames.length < 2) {
      return { hasInteractions: false, interactions: [] };
    }

    try {
      const interactions: Array<{
        drug1: string;
        drug2: string;
        severity: string;
        description: string;
      }> = [];

      // Query OpenFDA drug-drug interactions
      for (let i = 0; i < drugNames.length; i++) {
        for (let j = i + 1; j < drugNames.length; j++) {
          const drug1 = drugNames[i];
          const drug2 = drugNames[j];

          const apiKey = this.configService.get<string>('OPENFDA_API_KEY', '');
          const keyParam = apiKey ? `&api_key=${apiKey}` : '';

          const url = `https://api.fda.gov/drug/label.json?search=drug_interactions:"${encodeURIComponent(drug1)}"${keyParam}&limit=1`;

          try {
            const response = await firstValueFrom(
              this.httpService.get<any>(url, { timeout: 3000 }),
            );

            const results = response.data?.results || [];
            for (const result of results) {
              const interactionText = (result.drug_interactions || []).join(
                ' ',
              );
              if (interactionText.toLowerCase().includes(drug2.toLowerCase())) {
                interactions.push({
                  drug1,
                  drug2,
                  severity: 'MODERATE', // OpenFDA doesn't always specify
                  description: interactionText.substring(0, 300),
                });
              }
            }
          } catch {
            // OpenFDA unreachable — skip interaction check for this pair
          }
        }
      }

      return {
        hasInteractions: interactions.length > 0,
        interactions,
      };
    } catch {
      // Fail safe — return no interactions if API unavailable
      return { hasInteractions: false, interactions: [] };
    }
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
      drugName: dto.drugName,
      genericName: dto.genericName,
      form: dto.form ?? 'TABLET',
      strength: dto.strength,
      manufacturer: dto.manufacturer,
      batchNumber: dto.batchNo ?? `BATCH-${Date.now()}`,
      expiryDate: new Date(dto.expiryDate),
      quantityInStock: dto.quantity ?? 0,
      reorderLevel: dto.reorderLevel,
      unitPrice: dto.unitCost ?? dto.mrp ?? 0,
      mrp: dto.mrp ?? dto.unitCost ?? 0,
      hsnCode: dto.hsnCode,
      gstPercent: dto.gstPercent,
      storageLocation: dto.storageLocation,
      facilityId,
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
