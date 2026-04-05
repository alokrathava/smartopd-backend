import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { QUEUE_NAMES, JOB_NAMES, CrmFollowUpJobData } from '../queue.constants';

@Processor(QUEUE_NAMES.CRM_SCHEDULER)
export class CrmSchedulerWorker {
  private readonly logger = new Logger(CrmSchedulerWorker.name);

  @Process(JOB_NAMES.GENERATE_FOLLOWUPS)
  async handleFollowUpGeneration(job: Job<CrmFollowUpJobData>) {
    const { facilityId, date } = job.data;
    this.logger.log(
      `Generating follow-ups for facility ${facilityId} on ${date}`,
    );
    // CrmService injected when wired — finds visits from 3/7 days ago → creates follow-up entries
  }

  @Process(JOB_NAMES.SEND_CAMPAIGN)
  async handleCampaignSend(
    job: Job<{ campaignId: string; facilityId: string }>,
  ) {
    const { campaignId, facilityId } = job.data;
    this.logger.log(
      `Sending CRM campaign ${campaignId} for facility ${facilityId}`,
    );
    // CrmService.executeCampaign(campaignId) → enqueue individual notification jobs
  }

  @Process(JOB_NAMES.CHURN_SCORING)
  async handleChurnScoring(job: Job<{ facilityId: string }>) {
    const { facilityId } = job.data;
    this.logger.log(`Running churn scoring for facility ${facilityId}`);
    // Patients not seen in 90+ days → flag as LAPSED in PatientSegment
  }
}
