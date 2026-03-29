import { Processor, Process } from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUE_NAMES, JOB_NAMES, FhirPublishJobData } from '../queue.constants';
import { FhirService } from '../../fhir/fhir.service';

@Processor(QUEUE_NAMES.FHIR_PUBLISHER)
export class FhirPublisherWorker {
  private readonly logger = new Logger(FhirPublisherWorker.name);

  constructor(private readonly fhirService: FhirService) {}

  @Process(JOB_NAMES.PUBLISH_CONSULTATION)
  async handleConsultationPublish(job: Job<FhirPublishJobData>) {
    const { visitId, facilityId } = job.data;
    this.logger.log(`Publishing consultation FHIR bundle: visitId=${visitId}, facilityId=${facilityId}`);
    try {
      await this.fhirService.publishConsultation(visitId!, facilityId);
    } catch (err: any) {
      this.logger.error(`Failed to publish consultation for visit ${visitId}: ${err?.message || err}`);
      throw err;
    }
  }

  @Process(JOB_NAMES.PUBLISH_DISCHARGE)
  async handleDischargePublish(job: Job<FhirPublishJobData>) {
    const { admissionId, facilityId } = job.data;
    this.logger.log(`Publishing discharge FHIR bundle: admissionId=${admissionId}, facilityId=${facilityId}`);
    try {
      await this.fhirService.publishDischarge(admissionId!, facilityId);
    } catch (err: any) {
      this.logger.error(`Failed to publish discharge for admission ${admissionId}: ${err?.message || err}`);
      throw err;
    }
  }

  @Process(JOB_NAMES.PUBLISH_PRESCRIPTION)
  async handlePrescriptionPublish(job: Job<FhirPublishJobData>) {
    const { prescriptionId, facilityId } = job.data;
    this.logger.log(`Publishing prescription FHIR bundle: prescriptionId=${prescriptionId}, facilityId=${facilityId}`);
    try {
      await this.fhirService.publishPrescription(prescriptionId!, facilityId);
    } catch (err: any) {
      this.logger.error(`Failed to publish prescription ${prescriptionId}: ${err?.message || err}`);
      throw err;
    }
  }
}
