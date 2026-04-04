import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import {
  NotificationLog,
  NotificationChannel,
  NotificationStatus,
} from './entities/notification-log.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { QueueService } from '../queue/queue.service';

const makeQb = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getManyAndCount: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
  select: jest.fn().mockReturnThis(),
});

const mockLogRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockTemplateRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockQueueService = {
  enqueueSms: jest.fn().mockResolvedValue(undefined),
  enqueueEmail: jest.fn().mockResolvedValue(undefined),
  enqueueWhatsApp: jest.fn().mockResolvedValue(undefined),
};

describe('NotificationService', () => {
  let service: NotificationService;

  const facilityId = 'fac-test';
  const savedLog = { id: 'log-1', status: NotificationStatus.QUEUED };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockLogRepo.createQueryBuilder.mockReturnValue(makeQb());
    mockTemplateRepo.createQueryBuilder.mockReturnValue(makeQb());

    // Default mock — most send() tests rely on these
    mockLogRepo.create.mockReturnValue(savedLog);
    mockLogRepo.save.mockResolvedValue(savedLog);
    mockLogRepo.update.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(NotificationLog), useValue: mockLogRepo },
        { provide: getRepositoryToken(NotificationTemplate), useValue: mockTemplateRepo },
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  // ─── send() — SMS channel ─────────────────────────────────────────────────

  describe('send() — SMS channel', () => {
    it('creates a NotificationLog record with QUEUED status', async () => {
      await service.send(
        NotificationChannel.SMS,
        '+919876543210',
        'Test SMS body',
        facilityId,
      );

      expect(mockLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: NotificationChannel.SMS,
          recipient: '+919876543210',
          body: 'Test SMS body',
          status: NotificationStatus.QUEUED,
          facilityId,
        }),
      );
      expect(mockLogRepo.save).toHaveBeenCalledTimes(1);
    });

    it('routes to QueueService.enqueueSms for SMS channel', async () => {
      await service.send(
        NotificationChannel.SMS,
        '+919876543210',
        'Appointment reminder',
        facilityId,
        'APPT_REMINDER',
      );

      expect(mockQueueService.enqueueSms).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+919876543210',
          message: 'Appointment reminder',
          facilityId,
          notificationLogId: savedLog.id,
        }),
      );
      expect(mockQueueService.enqueueEmail).not.toHaveBeenCalled();
    });

    it('returns the saved log record', async () => {
      const result = await service.send(
        NotificationChannel.SMS,
        '+919876543210',
        'Hello',
        facilityId,
      );

      expect(result).toBe(savedLog);
    });
  });

  // ─── send() — EMAIL channel ───────────────────────────────────────────────

  describe('send() — EMAIL channel', () => {
    it('routes to QueueService.enqueueEmail for EMAIL channel', async () => {
      await service.send(
        NotificationChannel.EMAIL,
        'patient@example.com',
        'Your report is ready',
        facilityId,
        'REPORT_READY',
      );

      expect(mockQueueService.enqueueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'patient@example.com',
          body: 'Your report is ready',
          subject: 'SmartOPD - REPORT_READY',
          facilityId,
          notificationLogId: savedLog.id,
        }),
      );
      expect(mockQueueService.enqueueSms).not.toHaveBeenCalled();
    });

    it('uses default subject when templateCode is absent', async () => {
      await service.send(
        NotificationChannel.EMAIL,
        'patient@example.com',
        'Some body',
        facilityId,
      );

      expect(mockQueueService.enqueueEmail).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'SmartOPD Notification' }),
      );
    });
  });

  // ─── send() — WHATSAPP channel ────────────────────────────────────────────

  describe('send() — WHATSAPP channel', () => {
    it('routes to QueueService.enqueueWhatsApp for WHATSAPP channel', async () => {
      await service.send(
        NotificationChannel.WHATSAPP,
        '+919876543210',
        'Your appointment is confirmed',
        facilityId,
        'APPT_CONFIRM',
      );

      expect(mockQueueService.enqueueWhatsApp).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+919876543210',
          templateCode: 'APPT_CONFIRM',
          facilityId,
          notificationLogId: savedLog.id,
        }),
      );
      expect(mockQueueService.enqueueSms).not.toHaveBeenCalled();
    });

    it('falls back to general_notification templateCode when none provided', async () => {
      await service.send(
        NotificationChannel.WHATSAPP,
        '+919876543210',
        'Hello',
        facilityId,
      );

      expect(mockQueueService.enqueueWhatsApp).toHaveBeenCalledWith(
        expect.objectContaining({ templateCode: 'general_notification' }),
      );
    });
  });

  // ─── send() — PUSH channel ────────────────────────────────────────────────

  describe('send() — PUSH channel', () => {
    it('does NOT call any queue service method for PUSH channel', async () => {
      await service.send(
        NotificationChannel.PUSH,
        'device-token-xyz',
        'New test results available',
        facilityId,
      );

      expect(mockQueueService.enqueueSms).not.toHaveBeenCalled();
      expect(mockQueueService.enqueueEmail).not.toHaveBeenCalled();
      expect(mockQueueService.enqueueWhatsApp).not.toHaveBeenCalled();
    });

    it('marks log as SENT via logRepo.update for PUSH channel', async () => {
      await service.send(
        NotificationChannel.PUSH,
        'device-token-xyz',
        'Push message body',
        facilityId,
      );

      expect(mockLogRepo.update).toHaveBeenCalledWith(
        savedLog.id,
        expect.objectContaining({
          status: NotificationStatus.SENT,
          sentAt: expect.any(Date),
        }),
      );
    });
  });

  // ─── renderTemplate() ─────────────────────────────────────────────────────

  describe('renderTemplate()', () => {
    it('replaces known variables in the template', () => {
      const result = service.renderTemplate(
        'Hello {{name}}, your appointment is on {{date}}',
        { name: 'John', date: '2026-04-15' },
      );

      expect(result).toBe('Hello John, your appointment is on 2026-04-15');
    });

    it('keeps placeholder intact when variable is missing', () => {
      const result = service.renderTemplate('Hello {{name}}', {});

      expect(result).toBe('Hello {{name}}');
    });

    it('replaces multiple occurrences of the same variable', () => {
      const result = service.renderTemplate(
        '{{name}} please confirm. Regards, {{name}}',
        { name: 'Jane' },
      );

      expect(result).toBe('Jane please confirm. Regards, Jane');
    });
  });

  // ─── createTemplate() ─────────────────────────────────────────────────────

  describe('createTemplate()', () => {
    it('creates and saves a notification template', async () => {
      const dto = { code: 'APPT_REMINDER', body: 'Hello {{name}}', channel: 'SMS' };
      const saved = { id: 'tpl-1', ...dto, facilityId };
      mockTemplateRepo.create.mockReturnValue(saved);
      mockTemplateRepo.save.mockResolvedValue(saved);

      const result = await service.createTemplate(dto as any, facilityId);

      expect(mockTemplateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ facilityId }),
      );
      expect(result).toBe(saved);
    });
  });
});
