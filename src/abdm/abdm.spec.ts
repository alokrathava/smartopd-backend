import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { of } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { AbdmService } from './abdm.service';
import {
  AbdmRecord,
  AbdmFlowType,
  AbdmStatus,
} from './entities/abdm-record.entity';
import { Patient } from '../patients/entities/patient.entity';
import { QueueService } from '../queue/queue.service';

// ── Mock factory ───────────────────────────────────────────────────────────────

function makeRepo() {
  return {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
}

const mockHttpService = {
  post: jest
    .fn()
    .mockReturnValue(
      of({ data: { accessToken: 'mock-token', expiresIn: 3600 } }),
    ),
  get: jest.fn().mockReturnValue(of({ data: {} })),
};

const mockQueueService = {
  enqueueAbhaLinkageProcessing: jest.fn().mockResolvedValue({ id: '1' }),
};

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('AbdmService', () => {
  let service: AbdmService;
  let abdmRepo: ReturnType<typeof makeRepo>;
  let patientRepo: ReturnType<typeof makeRepo>;
  let configService: { get: jest.Mock };

  const facilityId = 'facility-001';

  const basePatient: Partial<Patient> = {
    id: 'patient-001',
    facilityId,
    firstName: 'Ravi',
    lastName: 'Kumar',
    phone: '+919876543210',
    abhaNumber: null!,
    abhaAddress: null!,
    aadhaarVerified: false,
    abhaLinkedAt: null!,
  };

  beforeEach(async () => {
    abdmRepo = makeRepo();
    patientRepo = makeRepo();
    configService = {
      // Return empty strings → triggers sandbox mode in the service
      get: jest.fn((key: string, def?: any) => def ?? ''),
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbdmService,
        { provide: getRepositoryToken(AbdmRecord), useValue: abdmRepo },
        { provide: getRepositoryToken(Patient), useValue: patientRepo },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: configService },
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    service = module.get<AbdmService>(AbdmService);
  });

  // ── generateAadhaarOtp ─────────────────────────────────────────────────────

  describe('generateAadhaarOtp() — sandbox mode (no ABDM_CLIENT_ID)', () => {
    it('throws NotFoundException when patient is not found', async () => {
      patientRepo.findOne.mockResolvedValue(null);

      await expect(
        service.generateAadhaarOtp(
          { patientId: 'ghost', aadhaarNumber: '123412341234' },
          facilityId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates an AbdmRecord with INITIATED status and returns a mock txnId', async () => {
      patientRepo.findOne.mockResolvedValue(basePatient);

      const record: Partial<AbdmRecord> = {
        id: 'abdm-001',
        patientId: basePatient.id,
        facilityId,
        flowType: AbdmFlowType.M1_ABHA_CREATION,
        status: AbdmStatus.INITIATED,
      };
      abdmRepo.create.mockReturnValue(record);
      abdmRepo.save.mockResolvedValue(record);
      abdmRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.generateAadhaarOtp(
        { patientId: 'patient-001', aadhaarNumber: '123412341234' },
        facilityId,
      );

      expect(abdmRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          flowType: AbdmFlowType.M1_ABHA_CREATION,
          status: AbdmStatus.INITIATED,
        }),
      );
      expect(result).toHaveProperty('txnId');
      expect(result).toHaveProperty('abdmRecordId');
      expect(result.message).toContain('sandbox');
    });

    it('updates the AbdmRecord status to OTP_SENT with a generated txnId', async () => {
      patientRepo.findOne.mockResolvedValue(basePatient);

      const record: any = { id: 'abdm-001' };
      abdmRepo.create.mockReturnValue(record);
      abdmRepo.save.mockResolvedValue(record);
      abdmRepo.update.mockResolvedValue({ affected: 1 });

      await service.generateAadhaarOtp(
        { patientId: 'patient-001', aadhaarNumber: '999988887777' },
        facilityId,
      );

      expect(abdmRepo.update).toHaveBeenCalledWith(
        'abdm-001',
        expect.objectContaining({ status: AbdmStatus.OTP_SENT }),
      );
    });
  });

  // ── verifyAadhaarOtpAndCreateAbha ──────────────────────────────────────────

  describe('verifyAadhaarOtpAndCreateAbha() — sandbox mode', () => {
    it('throws BadRequestException when no matching transaction record is found', async () => {
      abdmRepo.findOne.mockResolvedValue(null);

      await expect(
        service.verifyAadhaarOtpAndCreateAbha(
          { patientId: 'patient-001', txnId: 'bad-txn', otp: '123456' },
          facilityId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates AbdmRecord to LINKED and writes ABHA to patient record in sandbox mode', async () => {
      const record: any = { id: 'abdm-001', patientId: 'patient-001' };
      abdmRepo.findOne.mockResolvedValue(record);
      abdmRepo.update.mockResolvedValue({ affected: 1 });
      patientRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.verifyAadhaarOtpAndCreateAbha(
        { patientId: 'patient-001', txnId: 'valid-txn', otp: '654321' },
        facilityId,
      );

      expect(abdmRepo.update).toHaveBeenCalledWith(
        'abdm-001',
        expect.objectContaining({ status: AbdmStatus.LINKED }),
      );
      expect(patientRepo.update).toHaveBeenCalledWith(
        'patient-001',
        expect.objectContaining({
          aadhaarVerified: true,
          abhaLinkedAt: expect.any(Date),
        }),
      );
      expect(result).toHaveProperty('abhaNumber');
    });

    it('enqueues DHIS processing after successful ABHA creation', async () => {
      const record: any = { id: 'abdm-001', patientId: 'patient-001' };
      abdmRepo.findOne.mockResolvedValue(record);
      abdmRepo.update.mockResolvedValue({});
      patientRepo.update.mockResolvedValue({});

      await service.verifyAadhaarOtpAndCreateAbha(
        { patientId: 'patient-001', txnId: 'valid-txn', otp: '654321' },
        facilityId,
      );

      expect(
        mockQueueService.enqueueAbhaLinkageProcessing,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ patientId: 'patient-001', facilityId }),
      );
    });
  });

  // ── initiateM2Link ─────────────────────────────────────────────────────────

  describe('initiateM2Link() — sandbox mode', () => {
    it('throws NotFoundException when patient does not exist', async () => {
      patientRepo.findOne.mockResolvedValue(null);

      await expect(
        service.initiateM2Link(
          {
            patientId: 'ghost',
            abhaNumber: '91-1234-5678-9012',
            authMode: 'MOBILE_OTP',
          },
          facilityId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates M2_KYC_LINK record and returns mock txnId', async () => {
      patientRepo.findOne.mockResolvedValue(basePatient);

      const record: any = { id: 'abdm-m2-001' };
      abdmRepo.create.mockReturnValue(record);
      abdmRepo.save.mockResolvedValue(record);
      abdmRepo.update.mockResolvedValue({});

      const result = await service.initiateM2Link(
        {
          patientId: 'patient-001',
          abhaNumber: '91-1234-5678-9012',
          authMode: 'MOBILE_OTP',
        },
        facilityId,
      );

      expect(abdmRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ flowType: AbdmFlowType.M2_KYC_LINK }),
      );
      expect(result).toHaveProperty('txnId');
    });
  });

  // ── requestConsent ─────────────────────────────────────────────────────────

  describe('requestConsent() — sandbox mode', () => {
    it('throws NotFoundException when patient does not exist', async () => {
      patientRepo.findOne.mockResolvedValue(null);

      await expect(
        service.requestConsent(
          { patientId: 'ghost', purpose: 'CAREMGT' },
          facilityId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when patient has no ABHA number', async () => {
      patientRepo.findOne.mockResolvedValue({
        ...basePatient,
        abhaNumber: null,
      });

      await expect(
        service.requestConsent(
          { patientId: 'patient-001', purpose: 'CAREMGT' },
          facilityId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates M3_HIU_CONSENT record and auto-grants consent in sandbox mode', async () => {
      patientRepo.findOne.mockResolvedValue({
        ...basePatient,
        abhaNumber: '91-1234-5678-9012',
      });

      const record: any = { id: 'abdm-m3-001' };
      abdmRepo.create.mockReturnValue(record);
      abdmRepo.save.mockResolvedValue(record);
      abdmRepo.update.mockResolvedValue({});

      const result = await service.requestConsent(
        { patientId: 'patient-001', purpose: 'CAREMGT' },
        facilityId,
      );

      expect(result.status).toBe('GRANTED');
      expect(abdmRepo.update).toHaveBeenCalledWith(
        'abdm-m3-001',
        expect.objectContaining({ status: AbdmStatus.CONSENT_GRANTED }),
      );
    });
  });

  // ── getPatientAbdmHistory ──────────────────────────────────────────────────

  describe('getPatientAbdmHistory()', () => {
    it('returns ABDM records sorted by createdAt DESC', async () => {
      const records = [
        {
          id: 'r1',
          flowType: AbdmFlowType.M1_ABHA_CREATION,
          createdAt: new Date('2026-02-01'),
        },
        {
          id: 'r2',
          flowType: AbdmFlowType.M2_KYC_LINK,
          createdAt: new Date('2026-01-01'),
        },
      ];
      abdmRepo.find.mockResolvedValue(records);

      const result = await service.getPatientAbdmHistory(
        'patient-001',
        facilityId,
      );

      expect(abdmRepo.find).toHaveBeenCalledWith({
        where: { patientId: 'patient-001', facilityId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });
  });
});
