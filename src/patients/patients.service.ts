import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { PatientConsent } from './entities/patient-consent.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateConsentDto } from './dto/create-consent.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(PatientConsent)
    private readonly consentRepo: Repository<PatientConsent>,
  ) {}

  private async generateMrn(facilityId: string): Promise<string> {
    const year = new Date().getFullYear();
    const result = await this.patientRepo
      .createQueryBuilder('p')
      .where('p.facilityId = :facilityId', { facilityId })
      .andWhere('p.mrn IS NOT NULL')
      .orderBy('p.mrn', 'DESC')
      .getOne();

    let seq = 1;
    if (result?.mrn) {
      const parts = result.mrn.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `HOSP-${year}-${String(seq).padStart(6, '0')}`;
  }

  async create(
    dto: CreatePatientDto,
    facilityId: string,
    userId: string,
  ): Promise<Patient> {
    const mrn = await this.generateMrn(facilityId);
    const patient = this.patientRepo.create({
      ...dto,
      facilityId,
      createdBy: userId,
      mrn,
      dateOfBirth: new Date(dto.dateOfBirth),
    });
    return this.patientRepo.save(patient);
  }

  async findAll(
    facilityId: string,
    query: { search?: string; page?: number; limit?: number },
  ) {
    const { search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const qb = this.patientRepo
      .createQueryBuilder('p')
      .where('p.facilityId = :facilityId', { facilityId })
      .andWhere('p.deletedAt IS NULL')
      .skip(skip)
      .take(limit)
      .orderBy('p.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        '(p.firstName LIKE :s OR p.lastName LIKE :s OR p.phone LIKE :s OR p.mrn LIKE :s)',
        { s: `%${search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string, facilityId: string): Promise<Patient> {
    const patient = await this.patientRepo.findOne({
      where: { id, facilityId, deletedAt: IsNull() },
    });
    if (!patient) throw new NotFoundException(`Patient ${id} not found`);
    return patient;
  }

  async update(
    id: string,
    dto: UpdatePatientDto,
    facilityId: string,
  ): Promise<Patient> {
    const patient = await this.findOne(id, facilityId);
    Object.assign(patient, dto);
    if (dto.dateOfBirth) patient.dateOfBirth = new Date(dto.dateOfBirth);
    return this.patientRepo.save(patient);
  }

  async softDelete(id: string, facilityId: string): Promise<void> {
    const patient = await this.findOne(id, facilityId);
    await this.patientRepo.softDelete(patient.id);
  }

  async searchByPhone(phone: string, facilityId: string): Promise<Patient[]> {
    return this.patientRepo.find({
      where: { phone, facilityId },
    });
  }

  async searchByAbha(abha: string, facilityId: string): Promise<Patient[]> {
    return this.patientRepo.find({
      where: { abhaNumber: abha, facilityId },
    });
  }

  async recordConsent(
    patientId: string,
    dto: CreateConsentDto,
    facilityId: string,
    userId: string,
  ): Promise<PatientConsent> {
    const patient = await this.findOne(patientId, facilityId);
    const consent = this.consentRepo.create({
      patientId: patient.id,
      facilityId,
      consentType: dto.consentType,
      consentGivenAt: dto.consentGivenAt
        ? new Date(dto.consentGivenAt)
        : new Date(),
      consentGivenBy: userId,
      isGuardian: dto.isGuardian ?? false,
      guardianRelation: dto.guardianRelation,
      documentUrl: dto.documentUrl,
    });
    return this.consentRepo.save(consent);
  }

  async getConsents(
    patientId: string,
    facilityId: string,
  ): Promise<PatientConsent[]> {
    return this.consentRepo.find({
      where: { patientId, facilityId },
      order: { createdAt: 'DESC' },
    });
  }
}
