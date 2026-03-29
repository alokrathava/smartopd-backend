import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { NhcxClaimRecord, NhcxClaimStatus, NhcxClaimType } from './entities/nhcx-claim-record.entity';
import { CreateClaimDto, UpdateClaimStatusDto, ClaimQueryDto } from './dto/nhcx.dto';
import { Bill } from '../payment/entities/bill.entity';
import { Patient } from '../patients/entities/patient.entity';

@Injectable()
export class NhcxService {
  private readonly logger = new Logger(NhcxService.name);
  private readonly nhcxUrl: string;

  constructor(
    @InjectRepository(NhcxClaimRecord) private readonly claimRepo: Repository<NhcxClaimRecord>,
    @InjectRepository(Bill) private readonly billRepo: Repository<Bill>,
    @InjectRepository(Patient) private readonly patientRepo: Repository<Patient>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.nhcxUrl = configService.get<string>('NHCX_BASE_URL', 'https://dev.nhcx.abdm.gov.in');
  }

  async createClaim(dto: CreateClaimDto, facilityId: string, createdBy: string): Promise<NhcxClaimRecord> {
    const patient = await this.patientRepo.findOne({ where: { id: dto.patientId, facilityId } });
    if (!patient) throw new NotFoundException('Patient not found');

    // Build FHIR ClaimBundle
    const fhirBundle = this.buildFhirClaimBundle(dto, patient, facilityId);

    const claim = this.claimRepo.create({
      ...dto,
      facilityId,
      status: NhcxClaimStatus.DRAFT,
      fhirBundle: JSON.stringify(fhirBundle),
    });

    return this.claimRepo.save(claim);
  }

  async submitClaim(claimId: string, facilityId: string): Promise<NhcxClaimRecord> {
    const claim = await this.claimRepo.findOne({ where: { id: claimId, facilityId } });
    if (!claim) throw new NotFoundException('Claim not found');

    const nhcxClientId = this.configService.get<string>('NHCX_CLIENT_ID', '');

    if (!nhcxClientId) {
      // Sandbox mode — simulate submission
      const mockNhcxId = `NHCX-${Date.now()}`;
      await this.claimRepo.update(claimId, {
        status: NhcxClaimStatus.SUBMITTED,
        nhcxClaimId: mockNhcxId,
        submittedAt: new Date(),
      });
      this.logger.debug(`[NHCX MOCK] Claim ${claimId} submitted as ${mockNhcxId}`);
      return this.claimRepo.findOne({ where: { id: claimId } }) as Promise<NhcxClaimRecord>;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.nhcxUrl}/hcx/v0.7.1/claims/submit`,
          { payload: claim.fhirBundle },
          {
            headers: {
              Authorization: `Bearer ${nhcxClientId}`,
              'Content-Type': 'application/json',
              'X-HFR-ID': facilityId,
            },
          },
        ),
      );

      await this.claimRepo.update(claimId, {
        status: NhcxClaimStatus.SUBMITTED,
        nhcxClaimId: response.data?.claimId,
        nhcxResponse: JSON.stringify(response.data),
        submittedAt: new Date(),
      });
    } catch (err: any) {
      this.logger.error(`NHCX submission failed for claim ${claimId}: ${err.message}`);
      await this.claimRepo.update(claimId, {
        nhcxResponse: JSON.stringify({ error: err.message }),
      });
      throw err;
    }

    return this.claimRepo.findOne({ where: { id: claimId } }) as Promise<NhcxClaimRecord>;
  }

  async updateClaimStatus(claimId: string, dto: UpdateClaimStatusDto, facilityId: string) {
    const claim = await this.claimRepo.findOne({ where: { id: claimId, facilityId } });
    if (!claim) throw new NotFoundException('Claim not found');

    const updates: Partial<NhcxClaimRecord> = { status: dto.status };
    if (dto.approvedAmount !== undefined) updates.approvedAmount = dto.approvedAmount;
    if (dto.denialReason) updates.denialReason = dto.denialReason;
    if (dto.queryText) updates.queryText = dto.queryText;
    if ([NhcxClaimStatus.APPROVED, NhcxClaimStatus.DENIED, NhcxClaimStatus.PAID].includes(dto.status)) {
      updates.resolvedAt = new Date();
    }

    await this.claimRepo.update(claimId, updates);
    return this.claimRepo.findOne({ where: { id: claimId } });
  }

  async getClaims(facilityId: string, query: ClaimQueryDto): Promise<NhcxClaimRecord[]> {
    const qb = this.claimRepo.createQueryBuilder('c')
      .where('c.facilityId = :facilityId', { facilityId })
      .orderBy('c.createdAt', 'DESC');

    if (query.status) qb.andWhere('c.status = :status', { status: query.status });
    if (query.patientId) qb.andWhere('c.patientId = :patientId', { patientId: query.patientId });

    return qb.getMany();
  }

  async getClaim(claimId: string, facilityId: string): Promise<NhcxClaimRecord> {
    const claim = await this.claimRepo.findOne({ where: { id: claimId, facilityId } });
    if (!claim) throw new NotFoundException('Claim not found');
    return claim;
  }

  // ─── NHCX Webhook ──────────────────────────────────────────────────────────

  async handleNhcxWebhook(payload: any, facilityId: string) {
    const { claimId: nhcxClaimId, status, approvedAmount, denialReason } = payload;

    const claim = await this.claimRepo.findOne({ where: { nhcxClaimId, facilityId } });
    if (!claim) {
      this.logger.warn(`NHCX webhook: claim ${nhcxClaimId} not found for facility ${facilityId}`);
      return;
    }

    const statusMap: Record<string, NhcxClaimStatus> = {
      APPROVED: NhcxClaimStatus.APPROVED,
      PARTIALLY_APPROVED: NhcxClaimStatus.PARTIALLY_APPROVED,
      DENIED: NhcxClaimStatus.DENIED,
      QUERY_RAISED: NhcxClaimStatus.QUERY_RAISED,
      PAID: NhcxClaimStatus.PAID,
    };

    const mapped = statusMap[status];
    if (mapped) {
      await this.claimRepo.update(claim.id, {
        status: mapped,
        approvedAmount: approvedAmount ?? claim.approvedAmount,
        denialReason: denialReason ?? claim.denialReason,
        resolvedAt: [NhcxClaimStatus.APPROVED, NhcxClaimStatus.DENIED, NhcxClaimStatus.PAID].includes(mapped)
          ? new Date()
          : undefined,
        nhcxResponse: JSON.stringify(payload),
      });
    }
  }

  // ─── FHIR ClaimBundle Assembly ─────────────────────────────────────────────

  private buildFhirClaimBundle(dto: CreateClaimDto, patient: Patient, facilityId: string): object {
    const bundleId = uuidv4();
    const now = new Date().toISOString();

    return {
      resourceType: 'Bundle',
      id: bundleId,
      meta: { lastUpdated: now },
      identifier: { system: 'https://smartopd.in/nhcx/bundle', value: bundleId },
      type: 'collection',
      timestamp: now,
      entry: [
        {
          fullUrl: `urn:uuid:${uuidv4()}`,
          resource: {
            resourceType: 'Claim',
            id: uuidv4(),
            status: 'active',
            type: {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/claim-type', code: dto.claimType }],
            },
            use: 'claim',
            patient: { reference: `Patient/${patient.id}` },
            created: now,
            insurer: {
              display: dto.payerName,
              identifier: { value: dto.policyNumber },
            },
            provider: { identifier: { value: facilityId } },
            priority: { coding: [{ code: 'normal' }] },
            insurance: [{
              sequence: 1,
              focal: true,
              identifier: { value: dto.policyNumber },
              coverage: { display: dto.payerName },
              beneficiary: { identifier: { value: dto.memberId } },
            }],
            total: { value: dto.claimedAmount, currency: 'INR' },
          },
        },
        {
          fullUrl: `urn:uuid:${uuidv4()}`,
          resource: {
            resourceType: 'Patient',
            id: patient.id,
            identifier: [
              { system: 'https://smartopd.in/patient', value: patient.id },
              ...(patient.abhaNumber
                ? [{ system: 'https://ndhm.gov.in', value: patient.abhaNumber }]
                : []),
            ],
            name: [{ text: `${patient.firstName} ${patient.lastName}`, family: patient.lastName, given: [patient.firstName] }],
            gender: patient.gender?.toLowerCase(),
            birthDate: patient.dateOfBirth?.toISOString().split('T')[0],
            telecom: [{ system: 'phone', value: patient.phone }],
          },
        },
      ],
    };
  }
}
