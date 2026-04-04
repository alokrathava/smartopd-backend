import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { QueueService } from './queue.service';
import {
  QUEUE_NAMES,
  JOB_NAMES,
  SmsJobData,
  EmailJobData,
  WhatsAppJobData,
  FhirPublishJobData,
  DhisProcessJobData,
  CrmFollowUpJobData,
} from './queue.constants';

/**
 * Unit tests for QueueService.
 *
 * All four Bull queues are mocked — no Redis or BullMQ connection required.
 * Each method is tested to verify it routes the job to the correct queue
 * with the correct job name and options.
 */

const makeMockQueue = () => ({
  add: jest.fn().mockResolvedValue({ id: '1' }),
  getJobs: jest.fn().mockResolvedValue([]),
  process: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  close: jest.fn(),
});

describe('QueueService', () => {
  let service: QueueService;
  let notificationsQueue: ReturnType<typeof makeMockQueue>;
  let fhirQueue: ReturnType<typeof makeMockQueue>;
  let dhisQueue: ReturnType<typeof makeMockQueue>;
  let crmQueue: ReturnType<typeof makeMockQueue>;

  beforeEach(async () => {
    notificationsQueue = makeMockQueue();
    fhirQueue = makeMockQueue();
    dhisQueue = makeMockQueue();
    crmQueue = makeMockQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken(QUEUE_NAMES.NOTIFICATIONS),
          useValue: notificationsQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.FHIR_PUBLISHER),
          useValue: fhirQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.DHIS_PROCESSOR),
          useValue: dhisQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.CRM_SCHEDULER),
          useValue: crmQueue,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Module sanity ──────────────────────────────────────────────────────────

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── Notification jobs ──────────────────────────────────────────────────────

  describe('enqueueSms()', () => {
    it('adds a send-sms job to the notifications queue with high priority', async () => {
      const data: SmsJobData = {
        to: '+919876543210',
        message: 'Your OTP is 123456',
        facilityId: 'fac-1',
      };

      await service.enqueueSms(data);

      expect(notificationsQueue.add).toHaveBeenCalledTimes(1);
      expect(notificationsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.SEND_SMS,
        data,
        { priority: 1 },
      );
    });

    it('returns the job object from the queue', async () => {
      const data: SmsJobData = { to: '+91000', message: 'hi', facilityId: 'f1' };
      notificationsQueue.add.mockResolvedValueOnce({ id: 'job-sms-42' });

      const result = await service.enqueueSms(data);

      expect(result).toEqual({ id: 'job-sms-42' });
    });

    it('does NOT route to the FHIR or DHIS queue', async () => {
      await service.enqueueSms({ to: '+91', message: 'm', facilityId: 'f' });

      expect(fhirQueue.add).not.toHaveBeenCalled();
      expect(dhisQueue.add).not.toHaveBeenCalled();
      expect(crmQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('enqueueEmail()', () => {
    it('adds a send-email job to the notifications queue with priority 2', async () => {
      const data: EmailJobData = {
        to: 'doctor@hospital.com',
        subject: 'Appointment reminder',
        body: '<p>You have an appointment at 10 AM</p>',
        facilityId: 'fac-2',
      };

      await service.enqueueEmail(data);

      expect(notificationsQueue.add).toHaveBeenCalledTimes(1);
      expect(notificationsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.SEND_EMAIL,
        data,
        { priority: 2 },
      );
    });
  });

  describe('enqueueWhatsApp()', () => {
    it('adds a send-whatsapp job to the notifications queue with priority 2', async () => {
      const data: WhatsAppJobData = {
        to: '+919999999999',
        templateCode: 'OPD_REMINDER',
        variables: { name: 'Raj', time: '11:00 AM' },
        facilityId: 'fac-3',
      };

      await service.enqueueWhatsApp(data);

      expect(notificationsQueue.add).toHaveBeenCalledTimes(1);
      expect(notificationsQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.SEND_WHATSAPP,
        data,
        { priority: 2 },
      );
    });
  });

  // ─── FHIR jobs ───────────────────────────────────────────────────────────────

  describe('enqueueConsultationPublish()', () => {
    it('adds a publish-consultation job to the FHIR queue with a 2-second delay', async () => {
      const data: FhirPublishJobData = { visitId: 'v-1', facilityId: 'fac-1' };

      await service.enqueueConsultationPublish(data);

      expect(fhirQueue.add).toHaveBeenCalledTimes(1);
      expect(fhirQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.PUBLISH_CONSULTATION,
        data,
        { delay: 2000 },
      );
      expect(notificationsQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('enqueueDischargePublish()', () => {
    it('adds a publish-discharge job to the FHIR queue without delay', async () => {
      const data: FhirPublishJobData = { admissionId: 'adm-1', facilityId: 'fac-1' };

      await service.enqueueDischargePublish(data);

      expect(fhirQueue.add).toHaveBeenCalledWith(JOB_NAMES.PUBLISH_DISCHARGE, data);
    });
  });

  describe('enqueuePrescriptionPublish()', () => {
    it('adds a publish-prescription job to the FHIR queue with a 1-second delay', async () => {
      const data: FhirPublishJobData = { prescriptionId: 'rx-1', facilityId: 'fac-1' };

      await service.enqueuePrescriptionPublish(data);

      expect(fhirQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.PUBLISH_PRESCRIPTION,
        data,
        { delay: 1000 },
      );
    });
  });

  // ─── DHIS jobs ────────────────────────────────────────────────────────────────

  describe('enqueueAbhaLinkageProcessing()', () => {
    it('adds a process-abha-linkage job to the DHIS queue', async () => {
      const data: DhisProcessJobData = {
        patientId: 'pat-1',
        facilityId: 'fac-1',
        abhaLinkedAt: new Date().toISOString(),
      };

      await service.enqueueAbhaLinkageProcessing(data);

      expect(dhisQueue.add).toHaveBeenCalledTimes(1);
      expect(dhisQueue.add).toHaveBeenCalledWith(JOB_NAMES.PROCESS_ABHA_LINKAGE, data);
      expect(notificationsQueue.add).not.toHaveBeenCalled();
      expect(fhirQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('enqueueMonthlyDhisCompute()', () => {
    it('adds a compute-monthly-dhis job to the DHIS queue with the facilityId wrapped', async () => {
      await service.enqueueMonthlyDhisCompute('fac-5');

      expect(dhisQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.COMPUTE_MONTHLY_DHIS,
        { facilityId: 'fac-5' },
      );
    });
  });

  // ─── CRM jobs ─────────────────────────────────────────────────────────────────

  describe('enqueueFollowUpGeneration()', () => {
    it('adds a generate-followups job to the CRM queue', async () => {
      const data: CrmFollowUpJobData = {
        facilityId: 'fac-1',
        date: '2025-07-01',
      };

      await service.enqueueFollowUpGeneration(data);

      expect(crmQueue.add).toHaveBeenCalledTimes(1);
      expect(crmQueue.add).toHaveBeenCalledWith(JOB_NAMES.GENERATE_FOLLOWUPS, data);
      expect(notificationsQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('enqueueCampaignSend()', () => {
    it('adds a send-campaign job to the CRM queue with campaignId and facilityId', async () => {
      await service.enqueueCampaignSend('camp-99', 'fac-1');

      expect(crmQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.SEND_CAMPAIGN,
        { campaignId: 'camp-99', facilityId: 'fac-1' },
      );
    });
  });

  describe('enqueueChurnScoring()', () => {
    it('adds a churn-scoring job to the CRM queue', async () => {
      await service.enqueueChurnScoring('fac-1');

      expect(crmQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.CHURN_SCORING,
        { facilityId: 'fac-1' },
      );
    });
  });

  // ─── Queue isolation ─────────────────────────────────────────────────────────

  describe('queue isolation', () => {
    it('notification jobs never reach the FHIR, DHIS or CRM queues', async () => {
      await service.enqueueSms({ to: '+91', message: 'm', facilityId: 'f' });
      await service.enqueueEmail({
        to: 'a@b.com',
        subject: 's',
        body: 'b',
        facilityId: 'f',
      });
      await service.enqueueWhatsApp({
        to: '+91',
        templateCode: 'T',
        variables: {},
        facilityId: 'f',
      });

      expect(fhirQueue.add).not.toHaveBeenCalled();
      expect(dhisQueue.add).not.toHaveBeenCalled();
      expect(crmQueue.add).not.toHaveBeenCalled();
    });

    it('FHIR jobs never reach the notifications, DHIS or CRM queues', async () => {
      await service.enqueueConsultationPublish({ visitId: 'v', facilityId: 'f' });
      await service.enqueueDischargePublish({ admissionId: 'a', facilityId: 'f' });
      await service.enqueuePrescriptionPublish({ prescriptionId: 'p', facilityId: 'f' });

      expect(notificationsQueue.add).not.toHaveBeenCalled();
      expect(dhisQueue.add).not.toHaveBeenCalled();
      expect(crmQueue.add).not.toHaveBeenCalled();
    });
  });
});
