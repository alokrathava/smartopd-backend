import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowUp } from './entities/follow-up.entity';
import { PatientSegment } from './entities/patient-segment.entity';
import { CrmCampaign } from './entities/crm-campaign.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FollowUp, PatientSegment, CrmCampaign, Patient]),
  ],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
