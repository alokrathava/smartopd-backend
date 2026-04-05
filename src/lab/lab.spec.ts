import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { LabService } from './lab.service';
import {
  LabOrder,
  LabOrderStatus,
  LabPartner,
} from './entities/lab-order.entity';
import { LabResult, ResultStatus } from './entities/lab-result.entity';
import { Patient } from '../patients/entities/patient.entity';
import { NotificationService } from '../notification/notification.service';

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
  post: jest.fn().mockReturnValue(of({ data: { orderId: 'SRL-EXT-001' } })),
  get: jest.fn().mockReturnValue(of({ data: {} })),
};

const mockNotificationService = {
  send: jest.fn().mockResolvedValue(undefined),
};

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('LabService', () => {
  let service: LabService;
  let orderRepo: ReturnType<typeof makeRepo>;
  let resultRepo: ReturnType<typeof makeRepo>;
  let patientRepo: ReturnType<typeof makeRepo>;
  let configService: { get: jest.Mock };

  const facilityId = 'facility-001';
  const doctorId = 'doctor-001';

  const basePatient: Partial<Patient> = {
    id: 'patient-001',
    facilityId,
    firstName: 'Priya',
    lastName: 'Sharma',
    phone: '+919876543210',
    gender: 'FEMALE',
  };

  beforeEach(async () => {
    orderRepo = makeRepo();
    resultRepo = makeRepo();
    patientRepo = makeRepo();
    configService = {
      get: jest.fn((key: string, def?: any) => def ?? ''),
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabService,
        { provide: getRepositoryToken(LabOrder), useValue: orderRepo },
        { provide: getRepositoryToken(LabResult), useValue: resultRepo },
        { provide: getRepositoryToken(Patient), useValue: patientRepo },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: configService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<LabService>(LabService);
    (service as any).notificationService = mockNotificationService;
  });

  // ── createOrder ────────────────────────────────────────────────────────────

  describe('createOrder()', () => {
    it('throws NotFoundException when patient not found', async () => {
      patientRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createOrder(
          { patientId: 'ghost', testName: 'CBC', visitId: 'v-1' } as any,
          facilityId,
          doctorId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates an order with ORDERED status and IN_HOUSE partner by default', async () => {
      patientRepo.findOne.mockResolvedValue(basePatient);

      const order: any = {
        id: 'order-001',
        status: LabOrderStatus.ORDERED,
        partner: LabPartner.IN_HOUSE,
      };
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);

      const dto: any = {
        patientId: 'patient-001',
        testName: 'Complete Blood Count',
        visitId: 'v-1',
      };
      const result = await service.createOrder(dto, facilityId, doctorId);

      expect(orderRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: LabOrderStatus.ORDERED,
          orderedById: doctorId,
          partner: LabPartner.IN_HOUSE,
        }),
      );
      expect(result).toEqual(order);
    });

    it('embeds a FHIR ServiceRequest in the order', async () => {
      patientRepo.findOne.mockResolvedValue(basePatient);

      let capturedArgs: any;
      orderRepo.create.mockImplementation((d: any) => {
        capturedArgs = d;
        return d;
      });
      orderRepo.save.mockImplementation(async (d: any) => d);

      await service.createOrder(
        {
          patientId: 'patient-001',
          testName: 'HbA1c',
          loincCode: '4548-4',
          visitId: 'v-1',
        } as any,
        facilityId,
        doctorId,
      );

      const fhirReq = JSON.parse(capturedArgs.fhirServiceRequest);
      expect(fhirReq.resourceType).toBe('ServiceRequest');
      expect(fhirReq.status).toBe('active');
      expect(fhirReq.intent).toBe('order');
    });

    it('routes to external lab partner in mock mode when partner != IN_HOUSE and no API key', async () => {
      patientRepo.findOne.mockResolvedValue(basePatient);

      const order: any = {
        id: 'order-ext',
        partner: LabPartner.SRL,
        status: LabOrderStatus.ORDERED,
      };
      orderRepo.create.mockReturnValue(order);
      orderRepo.save.mockResolvedValue(order);
      orderRepo.update.mockResolvedValue({ affected: 1 });

      await service.createOrder(
        {
          patientId: 'patient-001',
          testName: 'Thyroid Panel',
          partner: LabPartner.SRL,
          visitId: 'v-1',
        } as any,
        facilityId,
        doctorId,
      );

      // Mock mode: update called with SENT_TO_LAB status
      expect(orderRepo.update).toHaveBeenCalledWith(
        'order-ext',
        expect.objectContaining({ status: LabOrderStatus.SENT_TO_LAB }),
      );
    });
  });

  // ── getOrder ───────────────────────────────────────────────────────────────

  describe('getOrder()', () => {
    it('returns the lab order when found', async () => {
      const order: any = { id: 'order-001', facilityId };
      orderRepo.findOne.mockResolvedValue(order);

      const result = await service.getOrder('order-001', facilityId);

      expect(result).toEqual(order);
    });

    it('throws NotFoundException when order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(service.getOrder('ghost', facilityId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── addResults ─────────────────────────────────────────────────────────────

  describe('addResults()', () => {
    it('throws NotFoundException when order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addResults(
          'ghost-order',
          [
            {
              componentName: 'Hb',
              value: '12',
              unit: 'g/dL',
              status: ResultStatus.NORMAL,
            } as any,
          ],
          facilityId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('saves each result and marks order as RESULTED', async () => {
      const order: any = {
        id: 'order-001',
        patientId: 'patient-001',
        testName: 'CBC',
        facilityId,
      };
      orderRepo.findOne.mockResolvedValue(order);
      patientRepo.findOne.mockResolvedValue(basePatient);

      const savedResult: any = { id: 'result-001' };
      resultRepo.create.mockReturnValue(savedResult);
      resultRepo.save.mockResolvedValue(savedResult);
      orderRepo.update.mockResolvedValue({ affected: 1 });

      const results = [
        {
          componentName: 'Haemoglobin',
          value: '13',
          unit: 'g/dL',
          status: ResultStatus.NORMAL,
        },
      ];
      const saved = await service.addResults(
        'order-001',
        results as any,
        facilityId,
      );

      expect(orderRepo.update).toHaveBeenCalledWith(
        'order-001',
        expect.objectContaining({
          status: LabOrderStatus.RESULTED,
          resultedAt: expect.any(Date),
        }),
      );
      expect(saved).toHaveLength(1);
    });

    it('sends SMS notification to patient after results are ready', async () => {
      const order: any = {
        id: 'order-001',
        patientId: 'patient-001',
        testName: 'Lipid Panel',
        facilityId,
      };
      orderRepo.findOne.mockResolvedValue(order);
      patientRepo.findOne.mockResolvedValue(basePatient);

      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation(async (d: any) => d);
      orderRepo.update.mockResolvedValue({ affected: 1 });

      await service.addResults(
        'order-001',
        [
          {
            componentName: 'LDL',
            value: '150',
            unit: 'mg/dL',
            status: ResultStatus.ABNORMAL_HIGH,
          },
        ] as any,
        facilityId,
      );

      expect(mockNotificationService.send).toHaveBeenCalledWith(
        expect.anything(), // channel
        '+919876543210', // patient phone
        expect.stringContaining('Lipid Panel'), // message includes test name
        facilityId,
        expect.any(String),
        expect.any(String),
        expect.any(String),
      );
    });

    it('appends critical alert to SMS when result has CRITICAL_HIGH status', async () => {
      const order: any = {
        id: 'order-001',
        patientId: 'patient-001',
        testName: 'Potassium',
        facilityId,
      };
      orderRepo.findOne.mockResolvedValue(order);
      patientRepo.findOne.mockResolvedValue(basePatient);

      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation(async (d: any) => d);
      orderRepo.update.mockResolvedValue({ affected: 1 });

      await service.addResults(
        'order-001',
        [
          {
            componentName: 'K+',
            value: '7.2',
            unit: 'mEq/L',
            status: ResultStatus.CRITICAL_HIGH,
          },
        ] as any,
        facilityId,
      );

      const smsMessage: string = mockNotificationService.send.mock.calls[0][2];
      expect(smsMessage).toContain('Critical');
    });
  });

  // ── cancelOrder ────────────────────────────────────────────────────────────

  describe('cancelOrder()', () => {
    it('sets status to CANCELLED', async () => {
      const order: any = { id: 'order-001', facilityId };
      orderRepo.findOne.mockResolvedValue(order);
      orderRepo.update.mockResolvedValue({ affected: 1 });

      const result = await service.cancelOrder('order-001', facilityId);

      expect(orderRepo.update).toHaveBeenCalledWith('order-001', {
        status: LabOrderStatus.CANCELLED,
      });
      expect(result).toEqual({ message: 'Lab order cancelled' });
    });

    it('throws NotFoundException when order not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(service.cancelOrder('ghost', facilityId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── handlePartnerWebhook ───────────────────────────────────────────────────

  describe('handlePartnerWebhook()', () => {
    it('routes results via addResults when matching order found', async () => {
      const order: any = {
        id: 'order-001',
        patientId: 'patient-001',
        testName: 'HbA1c',
        facilityId,
      };
      orderRepo.findOne
        .mockResolvedValueOnce(order) // findOne by externalOrderId
        .mockResolvedValueOnce(order); // findOne inside addResults
      patientRepo.findOne.mockResolvedValue(basePatient);

      resultRepo.create.mockImplementation((d: any) => d);
      resultRepo.save.mockImplementation(async (d: any) => d);
      orderRepo.update.mockResolvedValue({ affected: 1 });

      await service.handlePartnerWebhook(
        'SRL-EXT-001',
        [
          {
            componentName: 'HbA1c',
            value: '7.2',
            unit: '%',
            status: ResultStatus.ABNORMAL_HIGH,
          },
        ] as any,
        facilityId,
      );

      // addResults should mark the order RESULTED
      expect(orderRepo.update).toHaveBeenCalledWith(
        'order-001',
        expect.objectContaining({ status: LabOrderStatus.RESULTED }),
      );
    });

    it('silently returns when externalOrderId not found', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      const result = await service.handlePartnerWebhook(
        'UNKNOWN-EXT',
        [],
        facilityId,
      );

      expect(result).toBeUndefined();
      expect(orderRepo.update).not.toHaveBeenCalled();
    });
  });

  // ── getOrderResults ────────────────────────────────────────────────────────

  describe('getOrderResults()', () => {
    it('returns results ordered by createdAt ASC', async () => {
      const results = [{ id: 'r1' }, { id: 'r2' }];
      resultRepo.find.mockResolvedValue(results);

      const res = await service.getOrderResults('order-001', facilityId);

      expect(resultRepo.find).toHaveBeenCalledWith({
        where: { labOrderId: 'order-001', facilityId },
        order: { createdAt: 'ASC' },
      });
      expect(res).toHaveLength(2);
    });
  });
});
