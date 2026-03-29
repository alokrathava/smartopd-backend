import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { QUEUE_NAMES, JOB_NAMES, SmsJobData, EmailJobData, WhatsAppJobData } from '../queue.constants';
import { NotificationLog } from '../../notification/entities/notification-log.entity';

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationWorker {
  private readonly logger = new Logger(NotificationWorker.name);

  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepo: Repository<NotificationLog>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Process(JOB_NAMES.SEND_SMS)
  async handleSms(job: Job<SmsJobData>) {
    const { to, message, notificationLogId } = job.data;

    try {
      await this.sendSms(to, message);
      if (notificationLogId) {
        await this.logRepo.update(notificationLogId, {
          status: 'SENT',
          sentAt: new Date(),
        } as any);
      }
      this.logger.log(`SMS sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`SMS failed to ${to}: ${err.message}`);
      if (notificationLogId) {
        await this.logRepo.update(notificationLogId, {
          status: 'FAILED',
          errorMessage: err.message,
        } as any);
      }
      throw err; // trigger BullMQ retry
    }
  }

  @Process(JOB_NAMES.SEND_EMAIL)
  async handleEmail(job: Job<EmailJobData>) {
    const { to, subject, body, notificationLogId } = job.data;

    try {
      await this.sendEmail(to, subject, body);
      if (notificationLogId) {
        await this.logRepo.update(notificationLogId, {
          status: 'SENT',
          sentAt: new Date(),
        } as any);
      }
      this.logger.log(`Email sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`Email failed to ${to}: ${err.message}`);
      if (notificationLogId) {
        await this.logRepo.update(notificationLogId, {
          status: 'FAILED',
          errorMessage: err.message,
        } as any);
      }
      throw err;
    }
  }

  @Process(JOB_NAMES.SEND_WHATSAPP)
  async handleWhatsApp(job: Job<WhatsAppJobData>) {
    const { to, templateCode, variables, notificationLogId } = job.data;

    try {
      await this.sendWhatsApp(to, templateCode, variables);
      if (notificationLogId) {
        await this.logRepo.update(notificationLogId, {
          status: 'SENT',
          sentAt: new Date(),
        } as any);
      }
      this.logger.log(`WhatsApp sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`WhatsApp failed to ${to}: ${err.message}`);
      if (notificationLogId) {
        await this.logRepo.update(notificationLogId, {
          status: 'FAILED',
          errorMessage: err.message,
        } as any);
      }
      throw err;
    }
  }

  // ─── Provider Implementations ──────────────────────────────────────────────

  private async sendSms(to: string, message: string): Promise<void> {
    const apiKey = this.configService.get<string>('MSG91_API_KEY');
    const senderId = this.configService.get<string>('MSG91_SENDER_ID', 'SMTOPD');

    if (!apiKey) {
      // Dev/test: log to console
      this.logger.debug(`[SMS DEV] To: ${to} | Body: ${message}`);
      return;
    }

    // MSG91 API
    const url = 'https://api.msg91.com/api/v5/flow/';
    await firstValueFrom(
      this.httpService.post(
        url,
        {
          template_id: 'sms_otp', // adjust per MSG91 template
          short_url: '0',
          recipients: [{ mobiles: to, message }],
        },
        {
          headers: {
            authkey: apiKey,
            'Content-Type': 'application/json',
          },
        },
      ),
    );
  }

  private async sendEmail(to: string, subject: string, body: string): Promise<void> {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    const fromEmail = this.configService.get<string>('EMAIL_FROM', 'noreply@smartopd.in');

    if (!resendApiKey) {
      this.logger.debug(`[EMAIL DEV] To: ${to} | Subject: ${subject}`);
      return;
    }

    // Resend API
    await firstValueFrom(
      this.httpService.post(
        'https://api.resend.com/emails',
        { from: fromEmail, to, subject, html: body },
        { headers: { Authorization: `Bearer ${resendApiKey}` } },
      ),
    );
  }

  private async sendWhatsApp(
    to: string,
    templateCode: string,
    variables: Record<string, string>,
  ): Promise<void> {
    const wabaToken = this.configService.get<string>('WHATSAPP_API_TOKEN');
    const wabaId = this.configService.get<string>('WHATSAPP_BUSINESS_ACCOUNT_ID');
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (!wabaToken || !wabaId || !phoneNumberId) {
      this.logger.debug(`[WHATSAPP DEV] To: ${to} | Template: ${templateCode} | Vars: ${JSON.stringify(variables)}`);
      return;
    }

    // Meta WhatsApp Business API
    const components = [
      {
        type: 'body',
        parameters: Object.values(variables).map((v) => ({ type: 'text', text: v })),
      },
    ];

    await firstValueFrom(
      this.httpService.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: templateCode,
            language: { code: 'en_IN' },
            components,
          },
        },
        { headers: { Authorization: `Bearer ${wabaToken}` } },
      ),
    );
  }
}
