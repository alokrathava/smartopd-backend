import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admission } from './entities/admission.entity';
import { WardRound } from './entities/ward-round.entity';
import { WardRoundStop } from './entities/ward-round-stop.entity';
import { DischargeSummary } from './entities/discharge-summary.entity';
import { Bed } from '../room/entities/bed.entity';
import { AdmissionService } from './admission.service';
import { AdmissionController } from './admission.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Admission,
      WardRound,
      WardRoundStop,
      DischargeSummary,
      Bed,
    ]),
  ],
  controllers: [AdmissionController],
  providers: [AdmissionService],
  exports: [AdmissionService],
})
export class AdmissionModule {}
