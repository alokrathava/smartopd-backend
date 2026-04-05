import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Consultation } from './entities/consultation.entity';
import {
  Prescription,
  PrescriptionStatus,
} from './entities/prescription.entity';
import { PrescriptionItem } from './entities/prescription-item.entity';
import { Icd10 } from './entities/icd10.entity';
import { Visit } from '../visits/entities/visit.entity';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreatePrescriptionItemDto } from './dto/create-prescription-item.dto';
import { CompleteConsultationDto } from './dto/complete-consultation.dto';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Consultation)
    private readonly consultationRepo: Repository<Consultation>,
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(PrescriptionItem)
    private readonly prescriptionItemRepo: Repository<PrescriptionItem>,
    @InjectRepository(Icd10)
    private readonly icd10Repo: Repository<Icd10>,
    @InjectRepository(Visit)
    private readonly visitRepo: Repository<Visit>,
  ) {}

  async createConsultation(
    dto: CreateConsultationDto,
    facilityId: string,
    doctorId: string,
  ): Promise<Consultation> {
    if (!dto.visitId) throw new BadRequestException('visitId is required');
    const visit = await this.visitRepo.findOne({
      where: { id: dto.visitId, facilityId },
    });
    if (!visit) throw new NotFoundException(`Visit ${dto.visitId} not found`);
    const consultation = this.consultationRepo.create({
      ...dto,
      facilityId,
      doctorId,
      diagnoses: dto.diagnoses ? JSON.stringify(dto.diagnoses) : undefined,
      followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
    });
    return this.consultationRepo.save(consultation);
  }

  async getConsultation(
    visitId: string,
    facilityId: string,
  ): Promise<Consultation> {
    const c = await this.consultationRepo.findOne({
      where: { visitId, facilityId },
    });
    if (!c)
      throw new NotFoundException(
        `Consultation for visit ${visitId} not found`,
      );
    return c;
  }

  async updateConsultation(
    id: string,
    dto: CreateConsultationDto,
    facilityId: string,
  ): Promise<Consultation> {
    const c = await this.consultationRepo.findOne({
      where: { id, facilityId },
    });
    if (!c) throw new NotFoundException(`Consultation ${id} not found`);
    Object.assign(c, dto);
    if (dto.diagnoses) c.diagnoses = JSON.stringify(dto.diagnoses);
    if (dto.followUpDate) c.followUpDate = new Date(dto.followUpDate);
    return this.consultationRepo.save(c);
  }

  async completeConsultation(
    id: string,
    dto: CompleteConsultationDto,
    facilityId: string,
  ): Promise<Consultation> {
    const c = await this.consultationRepo.findOne({
      where: { id, facilityId },
    });
    if (!c) throw new NotFoundException(`Consultation ${id} not found`);
    Object.assign(c, dto);
    c.isComplete = true;
    c.completedAt = new Date();
    if (dto.followUpDate) c.followUpDate = new Date(dto.followUpDate);
    return this.consultationRepo.save(c);
  }

  async createPrescription(
    dto: CreatePrescriptionDto,
    facilityId: string,
    doctorId: string,
  ): Promise<Prescription> {
    const prescription = this.prescriptionRepo.create({
      ...dto,
      facilityId,
      prescribedById: doctorId,
      prescriptionDate: new Date(),
    });
    return this.prescriptionRepo.save(prescription);
  }

  async addPrescriptionItem(
    dto: CreatePrescriptionItemDto,
    facilityId: string,
  ): Promise<PrescriptionItem> {
    const prescription = await this.prescriptionRepo.findOne({
      where: { id: dto.prescriptionId, facilityId },
    });
    if (!prescription)
      throw new NotFoundException(
        `Prescription ${dto.prescriptionId} not found`,
      );
    if (prescription.status === PrescriptionStatus.FINALIZED) {
      throw new BadRequestException(
        'Cannot add items to a finalized prescription',
      );
    }
    const item = this.prescriptionItemRepo.create({ ...dto, facilityId });
    return this.prescriptionItemRepo.save(item);
  }

  async finalizePrescription(
    id: string,
    facilityId: string,
  ): Promise<Prescription> {
    const p = await this.prescriptionRepo.findOne({
      where: { id, facilityId },
    });
    if (!p) throw new NotFoundException(`Prescription ${id} not found`);
    p.status = PrescriptionStatus.FINALIZED;
    return this.prescriptionRepo.save(p);
  }

  async getPrescription(visitId: string, facilityId: string) {
    const prescription = await this.prescriptionRepo.findOne({
      where: { visitId, facilityId },
    });
    if (!prescription)
      throw new NotFoundException(
        `Prescription for visit ${visitId} not found`,
      );
    const items = await this.prescriptionItemRepo.find({
      where: { prescriptionId: prescription.id, facilityId },
    });
    return { ...prescription, items };
  }

  async searchIcd10(query: string): Promise<Icd10[]> {
    return this.icd10Repo.find({
      where: [
        { code: Like(`%${query}%`) },
        { description: Like(`%${query}%`) },
      ],
      take: 20,
    });
  }

  async getCommonIcd10(): Promise<Icd10[]> {
    return this.icd10Repo.find({ where: { isCommon: true }, take: 50 });
  }
}
