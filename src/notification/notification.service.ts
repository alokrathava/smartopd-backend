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

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    @InjectRepository(NotificationTemplate)
    private readonly templateRepo: Repository<NotificationTemplate>,
  ) {}

  renderTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }

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

    // Stub: log to console. Replace with actual SMS/WhatsApp/Email provider.
    try {
      switch (channel) {
        case NotificationChannel.SMS:
          console.log(`[SMS] To: ${recipient}, Body: ${body}`);
          break;
        case NotificationChannel.WHATSAPP:
          console.log(`[WhatsApp] To: ${recipient}, Body: ${body}`);
          break;
        case NotificationChannel.EMAIL:
          console.log(`[Email] To: ${recipient}, Body: ${body}`);
          break;
        case NotificationChannel.PUSH:
          console.log(`[Push] To: ${recipient}, Body: ${body}`);
          break;
      }

      await this.logRepo.update(saved.id, {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });
      saved.status = NotificationStatus.SENT;
    } catch (err) {
      await this.logRepo.update(saved.id, {
        status: NotificationStatus.FAILED,
        errorMessage: err.message,
      });
      saved.status = NotificationStatus.FAILED;
    }

    return saved;
  }

  async getTemplates(facilityId: string): Promise<NotificationTemplate[]> {
    return this.templateRepo.find({
      where: { facilityId, isActive: true },
      order: { code: 'ASC' },
    });
  }

  async createTemplate(dto: CreateTemplateDto, facilityId: string): Promise<NotificationTemplate> {
    const template = this.templateRepo.create({ ...dto, facilityId });
    return this.templateRepo.save(template);
  }
}
