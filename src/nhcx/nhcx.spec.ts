import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { NhcxService } from './nhcx.service';
import {
  NhcxClaimRecord,
  NhcxClaimStatus,
  NhcxClaimType,
} from './entities/nhcx-claim-record.entity';
import { Bill } from '../payment/entities/bill.entity';
import { Patient } from '../patients/entities/patient.entity';

// ── Mock factory ───────────────────────────────────────────────────────────────

function makeRepo() {
  return {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };
}

const mockHttpService = {
  post: jest.fn().mockReturnValue(of({ data: { claimId: 'NHCX-LIVE-001' } })),
};

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('NhcxService', () => {
  let service: NhcxService;
  let claimRepo: ReturnType<typeof makeRepo>;
  let billRepo: ReturnType<typeof makeRepo>;
  let patientRepo: ReturnType<typeof makeRepo>;
  let configService: { get: jest.Mock };

  const facilityId = 'facility-001';

  const basePatient: Partial<Patient> = {
    id: 'patient-001',
    facilityId,
    firstName: 'Raj',
    lastName: 'Kumar',
    phone: '+919876543210',
    gender: 'MALE',
    dateOfBirth: new Date('1985-06-15'),
    abhaNumber: '91-1234-5678-9012',
  };

  const baseDto = {
    patientId: 'patient-001',
    claimType: NhcxClaimType.OPD,
    payerName: 'National Health Insurance',
    policyNumber: 'POL-0001',
    memberId: 'MEM-001',
    claimedAmount: 5000,
  };

  beforeEach(async () => {
    claimRepo = makeRepo();
    billRepo = makeRepo();
    patientRepo = makeRepo();
    configService = {
      get: jest.fn((key: string, def?: any) => {
        if (key === 'NHCX_BASE_URL') return 'https://dev.nhcx.abdm.gov.in';
        return def ?? ''; // empty NHCX_CLIENT_ID → sandbox mode
      }),
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NhcxService,
        { provide: getRepositoryToken(NhcxClaimRecord), useValue: claimRepo },
        { provide: getRepositoryToken(Bill), useValue: billRepo },
        { provide: getRepositoryToken(Patient), useValue: patientRepo },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<NhcxService>(NhcxService);
  });

  // ── createClaim ────────────────────────────────────────────────────────────

  describe('createClaim()', () => {
    it('throws NotFoundException when patient not found', async () => {
      patientRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createClaim(baseDto as any, facilityId, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates a claim with DRAFT status and embedded FHIR bundle', async () => {
      patientRepo.findOne.mockResolvedValue(basePatient);

      const claim: any = { id: 'claim-001', status: NhcxClaimStatus.DRAFT };
      claimRepo.create.mockReturnValue(claim);
      claimRepo.save.mockResolvedValue(claim);

      const result = await service.createClaim(
        baseDto as any,
        facilityId,
        'user-1',
      );

      expect(claimRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: NhcxClaimStatus.DRAFT }),
      );
      expect(result).toEqual(claim);
    });

    it('embeds a FHIR ClaimBundle with Claim and Patient resources', async () => {
      patientRepo.findOne.mockResolvedValue(basePatient);

      let capturedArgs: any;
      claimRepo.create.mockImplementation((d: any) => {
        capturedArgs = d;
        return d;
      });
      claimRepo.save.mockImplementation(async (d: any) => d);

      await service.createClaim(baseDto as any, facilityId, 'user-1');

      const bundle = JSON.parse(capturedArgs.fhirBundle);
      expect(bundle.resourceType).toBe('Bundle');
      const resourceTypes = bundle.entry.map(
        (e: any) => e.resource.resourceType,
      );
      expect(resourceTypes).toContain('Claim');
      expect(resourceTypes).toContain('Patient');
    });
  });

  // ── submitClaim ────────────────────────────────────────────────────────────

  describe('submitClaim() — sandbox mode', () => {
    it('throws NotFoundException when claim does not exist', async () => {
      claimRepo.findOne.mockResolvedValue(null);

      await expect(
        service.submitClaim('ghost-claim', facilityId),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates status to SUBMITTED with a mock nhcxClaimId in sandbox mode', async () => {
      const claim: any = { id: 'claim-001', fhirBundle: '{}', facilityId };
      claimRepo.findOne
        .mockResolvedValueOnce(claim) // first call to find claim
        .mockResolvedValueOnce({ ...claim, status: NhcxClaimStatus.SUBMITTED }); // return after update
      claimRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.submitClaim('claim-001', facilityId);

      expect(claimRepo.update).toHaveBeenCalledWith(
        'claim-001',
        expect.objectContaining({
          status: NhcxClaimStatus.SUBMITTED,
          submittedAt: expect.any(Date),
        }),
      );
    });
  });

  // ── updateClaimStatus ──────────────────────────────────────────────────────

  describe('updateClaimStatus()', () => {
    it('throws NotFoundException when claim not found', async () => {
      claimRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateClaimStatus(
          'ghost',
          { status: NhcxClaimStatus.APPROVED } as any,
          facilityId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('sets resolvedAt when status is APPROVED', async () => {
      const claim: any = { id: 'claim-001' };
      claimRepo.findOne
        .mockResolvedValueOnce(claim)
        .mockResolvedValueOnce({ ...claim, status: NhcxClaimStatus.APPROVED });
      claimRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateClaimStatus(
        'claim-001',
        { status: NhcxClaimStatus.APPROVED, approvedAmount: 4500 } as any,
        facilityId,
      );

      expect(claimRepo.update).toHaveBeenCalledWith(
        'claim-001',
        expect.objectContaining({
          status: NhcxClaimStatus.APPROVED,
          resolvedAt: expect.any(Date),
        }),
      );
    });

    it('does NOT set resolvedAt for QUERY_RAISED status', async () => {
      const claim: any = { id: 'claim-001' };
      claimRepo.findOne.mockResolvedValueOnce(claim).mockResolvedValueOnce({
        ...claim,
        status: NhcxClaimStatus.QUERY_RAISED,
      });
      claimRepo.update.mockResolvedValue({ affected: 1 });

      await service.updateClaimStatus(
        'claim-001',
        {
          status: NhcxClaimStatus.QUERY_RAISED,
          queryText: 'Need more docs',
        } as any,
        facilityId,
      );

      const updateArgs = claimRepo.update.mock.calls[0][1] as any;
      expect(updateArgs.resolvedAt).toBeUndefined();
    });
  });

  // ── handleNhcxWebhook ──────────────────────────────────────────────────────

  describe('handleNhcxWebhook()', () => {
    it('maps APPROVED webhook status to NhcxClaimStatus.APPROVED', async () => {
      const claim: any = { id: 'claim-001', nhcxClaimId: 'NHCX-001' };
      claimRepo.findOne.mockResolvedValue(claim);
      claimRepo.update.mockResolvedValue({ affected: 1 });

      await service.handleNhcxWebhook(
        { claimId: 'NHCX-001', status: 'APPROVED', approvedAmount: 4000 },
        facilityId,
      );

      expect(claimRepo.update).toHaveBeenCalledWith(
        'claim-001',
        expect.objectContaining({ status: NhcxClaimStatus.APPROVED }),
      );
    });

    it('maps DENIED webhook status to NhcxClaimStatus.DENIED', async () => {
      const claim: any = { id: 'claim-001', nhcxClaimId: 'NHCX-002' };
      claimRepo.findOne.mockResolvedValue(claim);
      claimRepo.update.mockResolvedValue({ affected: 1 });

      await service.handleNhcxWebhook(
        {
          claimId: 'NHCX-002',
          status: 'DENIED',
          denialReason: 'Pre-existing condition',
        },
        facilityId,
      );

      expect(claimRepo.update).toHaveBeenCalledWith(
        'claim-001',
        expect.objectContaining({
          status: NhcxClaimStatus.DENIED,
          resolvedAt: expect.any(Date),
        }),
      );
    });

    it('maps PARTIALLY_APPROVED webhook status correctly', async () => {
      const claim: any = { id: 'claim-001', nhcxClaimId: 'NHCX-003' };
      claimRepo.findOne.mockResolvedValue(claim);
      claimRepo.update.mockResolvedValue({ affected: 1 });

      await service.handleNhcxWebhook(
        {
          claimId: 'NHCX-003',
          status: 'PARTIALLY_APPROVED',
          approvedAmount: 2500,
        },
        facilityId,
      );

      expect(claimRepo.update).toHaveBeenCalledWith(
        'claim-001',
        expect.objectContaining({ status: NhcxClaimStatus.PARTIALLY_APPROVED }),
      );
    });

    it('silently ignores webhook for unknown claimId', async () => {
      claimRepo.findOne.mockResolvedValue(null);

      // Should not throw
      await expect(
        service.handleNhcxWebhook(
          { claimId: 'UNKNOWN', status: 'APPROVED' },
          facilityId,
        ),
      ).resolves.toBeUndefined();

      expect(claimRepo.update).not.toHaveBeenCalled();
    });

    it('ignores unknown status strings', async () => {
      const claim: any = { id: 'claim-001', nhcxClaimId: 'NHCX-004' };
      claimRepo.findOne.mockResolvedValue(claim);

      await service.handleNhcxWebhook(
        { claimId: 'NHCX-004', status: 'UNKNOWN_STATUS' },
        facilityId,
      );

      expect(claimRepo.update).not.toHaveBeenCalled();
    });
  });

  // ── getClaim ───────────────────────────────────────────────────────────────

  describe('getClaim()', () => {
    it('returns claim when found', async () => {
      const claim: any = { id: 'claim-001', facilityId };
      claimRepo.findOne.mockResolvedValue(claim);

      const result = await service.getClaim('claim-001', facilityId);

      expect(result).toEqual(claim);
    });

    it('throws NotFoundException when claim not found', async () => {
      claimRepo.findOne.mockResolvedValue(null);

      await expect(service.getClaim('ghost', facilityId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
