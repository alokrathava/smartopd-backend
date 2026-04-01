import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import {
  AbdmRecord,
  AbdmFlowType,
  AbdmStatus,
} from './entities/abdm-record.entity';
import { Patient } from '../patients/entities/patient.entity';
import { QueueService } from '../queue/queue.service';
import {
  GenerateAadhaarOtpDto,
  VerifyAadhaarOtpDto,
  InitM2LinkDto,
  ConfirmM2LinkDto,
  RequestM3ConsentDto,
} from './dto/abdm.dto';

@Injectable()
export class AbdmService {
  private readonly logger = new Logger(AbdmService.name);
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private abdmAccessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(
    @InjectRepository(AbdmRecord)
    private readonly abdmRepo: Repository<AbdmRecord>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
  ) {
    this.baseUrl = configService.get<string>(
      'ABDM_BASE_URL',
      'https://dev.abdm.gov.in/gateway',
    );
    this.clientId = configService.get<string>('ABDM_CLIENT_ID', '');
    this.clientSecret = configService.get<string>('ABDM_CLIENT_SECRET', '');
  }

  // ─── ABDM Gateway Auth ─────────────────────────────────────────────────────

  private async getGatewayToken(): Promise<string> {
    if (
      this.abdmAccessToken &&
      this.tokenExpiresAt &&
      new Date() < this.tokenExpiresAt
    ) {
      return this.abdmAccessToken;
    }

    if (!this.clientId || !this.clientSecret) {
      this.logger.warn(
        '[ABDM] No credentials configured — using sandbox mock mode',
      );
      this.abdmAccessToken = 'mock-token';
      this.tokenExpiresAt = new Date(Date.now() + 3600 * 1000);
      return this.abdmAccessToken;
    }

    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/v0.5/sessions`,
        { clientId: this.clientId, clientSecret: this.clientSecret },
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );

    this.abdmAccessToken = response.data.accessToken;
    this.tokenExpiresAt = new Date(
      Date.now() + (response.data.expiresIn || 3600) * 1000,
    );
    return this.abdmAccessToken!;
  }

  private abdmHeaders(token: string, facilityId?: string) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-CM-ID': 'sbx', // Sandbox. Production: 'abdm'
      'X-HIP-ID': facilityId || '',
      'REQUEST-ID': uuidv4(),
      TIMESTAMP: new Date().toISOString(),
    };
  }

  // ─── M1: ABHA Creation via Aadhaar ────────────────────────────────────────

  /**
   * Step 1 of M1: Send OTP to Aadhaar-linked mobile
   * POST /v1/registration/aadhaar/generateOtp
   */
  async generateAadhaarOtp(dto: GenerateAadhaarOtpDto, facilityId: string) {
    const patient = await this.patientRepo.findOne({
      where: { id: dto.patientId, facilityId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    // Create ABDM record to track this flow
    const record = this.abdmRepo.create({
      patientId: dto.patientId,
      facilityId,
      flowType: AbdmFlowType.M1_ABHA_CREATION,
      status: AbdmStatus.INITIATED,
    });
    const saved = await this.abdmRepo.save(record);

    if (!this.clientId) {
      // Sandbox/dev mode — simulate
      const mockTxnId = uuidv4();
      await this.abdmRepo.update(saved.id, {
        txnId: mockTxnId,
        status: AbdmStatus.OTP_SENT,
      });
      this.logger.debug(
        `[ABDM MOCK] M1 OTP sent for patient ${dto.patientId}, txnId: ${mockTxnId}`,
      );
      return {
        message: 'OTP sent to Aadhaar-linked mobile (sandbox mode)',
        txnId: mockTxnId,
        abdmRecordId: saved.id,
      };
    }

    const token = await this.getGatewayToken();
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/v1/registration/aadhaar/generateOtp`,
        { aadhaar: dto.aadhaarNumber },
        { headers: this.abdmHeaders(token, facilityId) },
      ),
    );

    const txnId = response.data.txnId;
    await this.abdmRepo.update(saved.id, {
      txnId,
      status: AbdmStatus.OTP_SENT,
      rawResponse: JSON.stringify(response.data),
    });

    return {
      message: 'OTP sent to Aadhaar-linked mobile',
      txnId,
      abdmRecordId: saved.id,
    };
  }

  /**
   * Step 2 of M1: Verify OTP → creates ABHA and links to patient
   * POST /v1/registration/aadhaar/verifyOTP
   */
  async verifyAadhaarOtpAndCreateAbha(
    dto: VerifyAadhaarOtpDto,
    facilityId: string,
  ) {
    const record = await this.abdmRepo.findOne({
      where: {
        patientId: dto.patientId,
        facilityId,
        txnId: dto.txnId,
        flowType: AbdmFlowType.M1_ABHA_CREATION,
      },
    });
    if (!record)
      throw new BadRequestException(
        'Invalid transaction — initiate M1 flow first',
      );

    if (!this.clientId) {
      // Sandbox mode — simulate ABHA creation
      const mockAbha = `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const mockAddress = `patient${dto.patientId.slice(0, 8)}@abdm`;

      await this.abdmRepo.update(record.id, {
        status: AbdmStatus.LINKED,
        abhaNumber: mockAbha,
        abhaAddress: mockAddress,
      });
      await this.patientRepo.update(dto.patientId, {
        abhaNumber: mockAbha,
        abhaAddress: mockAddress,
        aadhaarVerified: true,
        abhaLinkedAt: new Date(),
      });
      await this.queueService.enqueueAbhaLinkageProcessing({
        patientId: dto.patientId,
        facilityId,
        abhaLinkedAt: new Date().toISOString(),
      });

      this.logger.debug(
        `[ABDM MOCK] ABHA created: ${mockAbha} for patient ${dto.patientId}`,
      );
      return {
        message: 'ABHA created successfully (sandbox)',
        abhaNumber: mockAbha,
        abhaAddress: mockAddress,
      };
    }

    const token = await this.getGatewayToken();
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/v1/registration/aadhaar/verifyOTP`,
        { txnId: dto.txnId, otp: dto.otp },
        { headers: this.abdmHeaders(token, facilityId) },
      ),
    );

    const { healthIdNumber, healthId } = response.data;

    await this.abdmRepo.update(record.id, {
      status: AbdmStatus.LINKED,
      abhaNumber: healthIdNumber,
      abhaAddress: healthId,
      rawResponse: JSON.stringify(response.data),
    });

    await this.patientRepo.update(dto.patientId, {
      abhaNumber: healthIdNumber,
      abhaAddress: healthId,
      aadhaarVerified: true,
      abhaLinkedAt: new Date(),
    });

    await this.queueService.enqueueAbhaLinkageProcessing({
      patientId: dto.patientId,
      facilityId,
      abhaLinkedAt: new Date().toISOString(),
    });

    return {
      message: 'ABHA created and linked',
      abhaNumber: healthIdNumber,
      abhaAddress: healthId,
    };
  }

  // ─── M2: KYC & Record Linking ──────────────────────────────────────────────

  /**
   * Initiate M2 linking — sends OTP to patient's mobile
   * POST /v0.5/hip/link/user-auth/init
   */
  async initiateM2Link(dto: InitM2LinkDto, facilityId: string) {
    const patient = await this.patientRepo.findOne({
      where: { id: dto.patientId, facilityId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const record = this.abdmRepo.create({
      patientId: dto.patientId,
      facilityId,
      flowType: AbdmFlowType.M2_KYC_LINK,
      status: AbdmStatus.INITIATED,
      abhaNumber: dto.abhaNumber,
    });
    const saved = await this.abdmRepo.save(record);

    if (!this.clientId) {
      const mockTxnId = uuidv4();
      await this.abdmRepo.update(saved.id, {
        txnId: mockTxnId,
        status: AbdmStatus.OTP_SENT,
      });
      return {
        message: 'M2 link OTP sent (sandbox)',
        txnId: mockTxnId,
        abdmRecordId: saved.id,
      };
    }

    const token = await this.getGatewayToken();
    const requestId = uuidv4();

    await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/v0.5/users/auth/init`,
        {
          requestId,
          timestamp: new Date().toISOString(),
          query: {
            id: dto.abhaNumber,
            purpose: 'KYC_AND_LINK',
            authMode: dto.authMode,
            requester: { type: 'HIP', id: facilityId },
          },
        },
        { headers: this.abdmHeaders(token, facilityId) },
      ),
    );

    await this.abdmRepo.update(saved.id, {
      txnId: requestId,
      status: AbdmStatus.OTP_SENT,
    });
    return {
      message: 'M2 link OTP sent to patient',
      txnId: requestId,
      abdmRecordId: saved.id,
    };
  }

  /**
   * Confirm M2 linking with OTP
   * POST /v0.5/users/auth/confirm
   */
  async confirmM2Link(dto: ConfirmM2LinkDto, facilityId: string) {
    const record = await this.abdmRepo.findOne({
      where: {
        patientId: dto.patientId,
        facilityId,
        txnId: dto.txnId,
        flowType: AbdmFlowType.M2_KYC_LINK,
      },
    });
    if (!record) throw new BadRequestException('Invalid transaction');

    if (!this.clientId) {
      await this.abdmRepo.update(record.id, { status: AbdmStatus.LINKED });
      await this.patientRepo.update(dto.patientId, {
        abhaNumber: record.abhaNumber || undefined,
        abhaLinkedAt: new Date(),
      });
      await this.queueService.enqueueAbhaLinkageProcessing({
        patientId: dto.patientId,
        facilityId,
        abhaLinkedAt: new Date().toISOString(),
      });
      return { message: 'M2 KYC link confirmed (sandbox)', linked: true };
    }

    const token = await this.getGatewayToken();
    await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/v0.5/users/auth/confirm`,
        {
          requestId: uuidv4(),
          timestamp: new Date().toISOString(),
          credential: { authCode: dto.otp },
        },
        { headers: this.abdmHeaders(token, facilityId) },
      ),
    );

    await this.abdmRepo.update(record.id, { status: AbdmStatus.LINKED });
    await this.patientRepo.update(dto.patientId, {
      abhaNumber: record.abhaNumber || undefined,
      abhaLinkedAt: new Date(),
    });
    await this.queueService.enqueueAbhaLinkageProcessing({
      patientId: dto.patientId,
      facilityId,
      abhaLinkedAt: new Date().toISOString(),
    });

    return { message: 'M2 KYC link confirmed', linked: true };
  }

  // ─── M3: HIU Consent + Health Record Pull ─────────────────────────────────

  /**
   * Request consent from patient to pull health records
   * POST /v0.5/consent-requests/init
   */
  async requestConsent(dto: RequestM3ConsentDto, facilityId: string) {
    const patient = await this.patientRepo.findOne({
      where: { id: dto.patientId, facilityId },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    if (!patient.abhaNumber)
      throw new BadRequestException(
        'Patient ABHA not linked — complete M1/M2 first',
      );

    const record = this.abdmRepo.create({
      patientId: dto.patientId,
      facilityId,
      flowType: AbdmFlowType.M3_HIU_CONSENT,
      status: AbdmStatus.CONSENT_REQUESTED,
      abhaNumber: patient.abhaNumber,
    });
    const saved = await this.abdmRepo.save(record);

    if (!this.clientId) {
      const mockArtefact = `consent-${uuidv4()}`;
      await this.abdmRepo.update(saved.id, {
        consentArtefactId: mockArtefact,
        status: AbdmStatus.CONSENT_GRANTED,
      });
      return {
        message: 'Consent request sent (sandbox — auto-approved)',
        consentArtefactId: mockArtefact,
        abdmRecordId: saved.id,
        status: 'GRANTED',
      };
    }

    const token = await this.getGatewayToken();
    const consentRequestId = uuidv4();
    const now = new Date();
    const from = new Date('2020-01-01').toISOString();
    const to = new Date(now.getTime() + 86400000).toISOString(); // +1 day

    await firstValueFrom(
      this.httpService.post(
        `${this.baseUrl}/v0.5/consent-requests/init`,
        {
          requestId: consentRequestId,
          timestamp: now.toISOString(),
          consent: {
            purpose: {
              text: dto.purpose,
              code: dto.purpose,
              refUri: 'http://terminology.hl7.org/ValueSet/v3-PurposeOfUse',
            },
            patient: { id: patient.abhaAddress || patient.abhaNumber },
            hiu: { id: facilityId },
            requester: {
              name: 'SmartOPD',
              identifier: {
                type: 'REGNO',
                value: facilityId,
                system: 'https://smartopd.in',
              },
            },
            hiTypes: dto.hiTypes || [
              'DiagnosticReport',
              'Prescription',
              'OPConsultation',
              'DischargeSummary',
            ],
            permission: {
              accessMode: 'VIEW',
              dateRange: { from, to },
              dataEraseAt: new Date(
                now.getTime() + 30 * 86400000,
              ).toISOString(),
              frequency: { unit: 'HOUR', value: 1, repeats: 0 },
            },
          },
        },
        { headers: this.abdmHeaders(token, facilityId) },
      ),
    );

    await this.abdmRepo.update(saved.id, { txnId: consentRequestId });
    return {
      message: 'Consent request sent to patient',
      abdmRecordId: saved.id,
      status: 'PENDING_PATIENT_APPROVAL',
    };
  }

  /** ABDM webhook: consent granted callback */
  async handleConsentGranted(consentArtefactId: string, facilityId: string) {
    const record = await this.abdmRepo.findOne({
      where: {
        facilityId,
        flowType: AbdmFlowType.M3_HIU_CONSENT,
        status: AbdmStatus.CONSENT_REQUESTED,
      },
    });
    if (record) {
      await this.abdmRepo.update(record.id, {
        consentArtefactId,
        status: AbdmStatus.CONSENT_GRANTED,
      });
    }
  }

  async getPatientAbdmHistory(patientId: string, facilityId: string) {
    return this.abdmRepo.find({
      where: { patientId, facilityId },
      order: { createdAt: 'DESC' },
    });
  }
}
