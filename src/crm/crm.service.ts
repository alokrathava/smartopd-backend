import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUp, FollowUpStatus } from './entities/follow-up.entity';
import { PatientSegment } from './entities/patient-segment.entity';
import { CrmCampaign } from './entities/crm-campaign.entity';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { CreateSegmentDto } from './dto/create-segment.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(FollowUp)
    private readonly followUpRepo: Repository<FollowUp>,
    @InjectRepository(PatientSegment)
    private readonly segmentRepo: Repository<PatientSegment>,
    @InjectRepository(CrmCampaign)
    private readonly campaignRepo: Repository<CrmCampaign>,
  ) {}

  async createFollowUp(dto: CreateFollowUpDto, facilityId: string): Promise<FollowUp> {
    const followUp = this.followUpRepo.create({
      ...dto,
      facilityId,
      followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : new Date(),
    });
    return this.followUpRepo.save(followUp);
  }

  async getTodaysFollowUps(facilityId: string): Promise<FollowUp[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.followUpRepo
      .createQueryBuilder('f')
      .where('f.facilityId = :facilityId', { facilityId })
      .andWhere('f.followUpDate >= :today AND f.followUpDate < :tomorrow', { today, tomorrow })
      .andWhere('f.status = :status', { status: FollowUpStatus.PENDING })
      .orderBy('f.priority', 'DESC')
      .getMany();
  }

  async getFollowUps(
    facilityId: string,
    filters?: { date?: string; status?: FollowUpStatus; patientId?: string },
  ): Promise<FollowUp[]> {
    const qb = this.followUpRepo
      .createQueryBuilder('f')
      .where('f.facilityId = :facilityId', { facilityId })
      .orderBy('f.followUpDate', 'ASC');

    if (filters?.date) {
      const d = new Date(filters.date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      qb.andWhere('f.followUpDate >= :d AND f.followUpDate < :next', { d, next });
    }
    if (filters?.status) qb.andWhere('f.status = :status', { status: filters.status });
    if (filters?.patientId) qb.andWhere('f.patientId = :patientId', { patientId: filters.patientId });

    return qb.getMany();
  }

  async updateFollowUp(id: string, dto: Partial<CreateFollowUpDto> & { status?: FollowUpStatus; notes?: string }, facilityId: string): Promise<FollowUp> {
    const followUp = await this.followUpRepo.findOne({ where: { id, facilityId } });
    if (!followUp) throw new NotFoundException(`Follow-up ${id} not found`);

    Object.assign(followUp, dto);
    if (dto.followUpDate) followUp.followUpDate = new Date(dto.followUpDate);
    if (dto.status === FollowUpStatus.COMPLETED) {
      followUp.completedAt = new Date();
    }
    return this.followUpRepo.save(followUp);
  }

  async createSegment(dto: CreateSegmentDto, facilityId: string): Promise<PatientSegment> {
    const segment = this.segmentRepo.create({
      ...dto,
      facilityId,
      criteria: dto.criteria ?? '{}',
    });
    return this.segmentRepo.save(segment);
  }

  async getSegments(facilityId: string): Promise<PatientSegment[]> {
    return this.segmentRepo.find({
      where: { facilityId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async createCampaign(dto: CreateCampaignDto, facilityId: string): Promise<CrmCampaign> {
    const campaign = this.campaignRepo.create({
      ...dto,
      facilityId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
    return this.campaignRepo.save(campaign);
  }

  async getCampaigns(facilityId: string): Promise<CrmCampaign[]> {
    return this.campaignRepo.find({
      where: { facilityId },
      order: { createdAt: 'DESC' },
    });
  }
}
