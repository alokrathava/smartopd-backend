export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  FHIR_PUBLISHER: 'fhir-publisher',
  DHIS_PROCESSOR: 'dhis-processor',
  CRM_SCHEDULER: 'crm-scheduler',
} as const;

export const JOB_NAMES = {
  // Notifications
  SEND_SMS: 'send-sms',
  SEND_EMAIL: 'send-email',
  SEND_WHATSAPP: 'send-whatsapp',

  // FHIR
  PUBLISH_CONSULTATION: 'publish-consultation',
  PUBLISH_DISCHARGE: 'publish-discharge',
  PUBLISH_PRESCRIPTION: 'publish-prescription',

  // DHIS
  PROCESS_ABHA_LINKAGE: 'process-abha-linkage',
  COMPUTE_MONTHLY_DHIS: 'compute-monthly-dhis',

  // CRM
  GENERATE_FOLLOWUPS: 'generate-followups',
  SEND_CAMPAIGN: 'send-campaign',
  CHURN_SCORING: 'churn-scoring',
} as const;

export interface SmsJobData {
  to: string;
  message: string;
  facilityId: string;
  notificationLogId?: string;
}

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
  facilityId: string;
  notificationLogId?: string;
}

export interface WhatsAppJobData {
  to: string;
  templateCode: string;
  variables: Record<string, string>;
  facilityId: string;
  notificationLogId?: string;
}

export interface FhirPublishJobData {
  visitId?: string;
  admissionId?: string;
  prescriptionId?: string;
  facilityId: string;
}

export interface DhisProcessJobData {
  patientId: string;
  facilityId: string;
  abhaLinkedAt: string;
}

export interface CrmFollowUpJobData {
  facilityId: string;
  date: string;
}
