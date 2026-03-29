import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationLog,
  NotificationChannel,
  NotificationStatus,
} from './entities/notification-log.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    @InjectRepository(NotificationTemplate)
    private readonly templateRepo: Repository<NotificationTemplate>,
    private readonly queueService: QueueService,
  ) {}

  renderTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(
      /\{\{(\w+)\}\}/g,
      (_, key) => vars[key] ?? `{{${key}}}`,
    );
  }

  /**
   * Enqueue a notification via BullMQ.
   * Creates a log record immediately (QUEUED), actual send happens in the worker.
   */
  async send(
    channel: NotificationChannel,
    recipient: string,
    body: string,
    facilityId?: string,
    templateCode?: string,
    relatedEntityType?: string,
    relatedEntityId?: string,
  ): Promise<NotificationLog> {
    const log = this.logRepo.create({
      channel,
      recipient,
      body,
      facilityId,
      templateCode,
      relatedEntityType,
      relatedEntityId,
      status: NotificationStatus.QUEUED,
    });

    const saved = await this.logRepo.save(log);

    // Route to the correct BullMQ worker based on channel
    switch (channel) {
      case NotificationChannel.SMS:
        await this.queueService.enqueueSms({
          to: recipient,
          message: body,
          facilityId: facilityId || 'system',
          notificationLogId: saved.id,
        });
        break;

      case NotificationChannel.EMAIL:
        await this.queueService.enqueueEmail({
          to: recipient,
          subject: templateCode ? `SmartOPD - ${templateCode}` : 'SmartOPD Notification',
          body,
          facilityId: facilityId || 'system',
          notificationLogId: saved.id,
        });
        break;

      case NotificationChannel.WHATSAPP:
        await this.queueService.enqueueWhatsApp({
          to: recipient,
          templateCode: templateCode || 'general_notification',
          variables: { message: body },
          facilityId: facilityId || 'system',
          notificationLogId: saved.id,
        });
        break;

      case NotificationChannel.PUSH:
        // Push notifications handled via FCM — log to console in dev
        // TODO: Firebase Cloud Messaging integration
        console.log(`[PUSH DEV] To: ${recipient}, Body: ${body}`);
        await this.logRepo.update(saved.id, {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        });
        break;
    }

    return saved;
  }

  async getLogs(
    facilityId: string,
    channel?: NotificationChannel,
    limit = 50,
  ): Promise<NotificationLog[]> {
    const qb = this.logRepo
      .createQueryBuilder('n')
      .where('n.facilityId = :facilityId', { facilityId })
      .orderBy('n.createdAt', 'DESC')
      .take(limit);
    if (channel) qb.andWhere('n.channel = :channel', { channel });
    return qb.getMany();
  }

  async getTemplates(facilityId: string): Promise<NotificationTemplate[]> {
    return this.templateRepo.find({
      where: { facilityId, isActive: true },
      order: { code: 'ASC' },
    });
  }

  async createTemplate(
    dto: CreateTemplateDto,
    facilityId: string,
  ): Promise<NotificationTemplate> {
    const template = this.templateRepo.create({ ...dto, facilityId });
    return this.templateRepo.save(template);
  }
}
