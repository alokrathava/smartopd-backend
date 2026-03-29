import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QUEUE_NAMES, JOB_NAMES, DhisProcessJobData } from '../queue.constants';
import { Patient } from '../../patients/entities/patient.entity';

@Processor(QUEUE_NAMES.DHIS_PROCESSOR)
export class DhisProcessorWorker {
  private readonly logger = new Logger(DhisProcessorWorker.name);

  constructor(
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  @Process(JOB_NAMES.PROCESS_ABHA_LINKAGE)
  async handleAbhaLinkage(job: Job<DhisProcessJobData>) {
    const { patientId, facilityId, abhaLinkedAt } = job.data;
    this.logger.log(`Processing ABHA linkage for DHIS: patientId=${patientId}, facilityId=${facilityId}`);

    // Mark patient as ABHA-linked with timestamp
    await this.patientRepo.update(
      { id: patientId, facilityId },
      { abhaLinkedAt: new Date(abhaLinkedAt) } as any,
    );

    this.logger.log(`DHIS: ABHA linkage recorded for patient ${patientId}`);
  }

  @Process(JOB_NAMES.COMPUTE_MONTHLY_DHIS)
  async handleMonthlyDhisCompute(job: Job<{ facilityId: string }>) {
    const { facilityId } = job.data;
    this.logger.log(`Computing monthly DHIS incentives for facility ${facilityId}`);
    // Actual computation delegated to ReportsService.getDhisDashboard()
    // This job exists to trigger caching/notification of results
  }
}
