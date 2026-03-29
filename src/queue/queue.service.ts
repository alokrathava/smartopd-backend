import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
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

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS) private notificationsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.FHIR_PUBLISHER) private fhirQueue: Queue,
    @InjectQueue(QUEUE_NAMES.DHIS_PROCESSOR) private dhisQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CRM_SCHEDULER) private crmQueue: Queue,
  ) {}

  // ─── Notification Jobs ─────────────────────────────────────────────────────

  async enqueueSms(data: SmsJobData) {
    return this.notificationsQueue.add(JOB_NAMES.SEND_SMS, data, {
      priority: 1, // high priority
    });
  }

  async enqueueEmail(data: EmailJobData) {
    return this.notificationsQueue.add(JOB_NAMES.SEND_EMAIL, data, {
      priority: 2,
    });
  }

  async enqueueWhatsApp(data: WhatsAppJobData) {
    return this.notificationsQueue.add(JOB_NAMES.SEND_WHATSAPP, data, {
      priority: 2,
    });
  }

  // ─── FHIR Jobs ─────────────────────────────────────────────────────────────

  async enqueueConsultationPublish(data: FhirPublishJobData) {
    return this.fhirQueue.add(JOB_NAMES.PUBLISH_CONSULTATION, data, {
      delay: 2000, // 2 second delay after sign-off
    });
  }

  async enqueueDischargePublish(data: FhirPublishJobData) {
    return this.fhirQueue.add(JOB_NAMES.PUBLISH_DISCHARGE, data);
  }

  async enqueuePrescriptionPublish(data: FhirPublishJobData) {
    return this.fhirQueue.add(JOB_NAMES.PUBLISH_PRESCRIPTION, data, {
      delay: 1000,
    });
  }

  // ─── DHIS Jobs ─────────────────────────────────────────────────────────────

  async enqueueAbhaLinkageProcessing(data: DhisProcessJobData) {
    return this.dhisQueue.add(JOB_NAMES.PROCESS_ABHA_LINKAGE, data);
  }

  async enqueueMonthlyDhisCompute(facilityId: string) {
    return this.dhisQueue.add(JOB_NAMES.COMPUTE_MONTHLY_DHIS, { facilityId });
  }

  // ─── CRM Jobs ──────────────────────────────────────────────────────────────

  async enqueueFollowUpGeneration(data: CrmFollowUpJobData) {
    return this.crmQueue.add(JOB_NAMES.GENERATE_FOLLOWUPS, data);
  }

  async enqueueCampaignSend(campaignId: string, facilityId: string) {
    return this.crmQueue.add(JOB_NAMES.SEND_CAMPAIGN, { campaignId, facilityId });
  }

  async enqueueChurnScoring(facilityId: string) {
    return this.crmQueue.add(JOB_NAMES.CHURN_SCORING, { facilityId });
  }
}
