import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants';
import { QueueService } from './queue.service';
import { NotificationWorker } from './workers/notification.worker';
import { FhirPublisherWorker } from './workers/fhir-publisher.worker';
import { DhisProcessorWorker } from './workers/dhis-processor.worker';
import { CrmSchedulerWorker } from './workers/crm-scheduler.worker';
import { NotificationLog } from '../notification/entities/notification-log.entity';
import { Patient } from '../patients/entities/patient.entity';
import { FhirModule } from '../fhir/fhir.module';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
          db: configService.get<number>('REDIS_DB', 0),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.NOTIFICATIONS },
      { name: QUEUE_NAMES.FHIR_PUBLISHER },
      { name: QUEUE_NAMES.DHIS_PROCESSOR },
      { name: QUEUE_NAMES.CRM_SCHEDULER },
    ),
    TypeOrmModule.forFeature([NotificationLog, Patient]),
    HttpModule,
    FhirModule,
  ],
  providers: [
    QueueService,
    NotificationWorker,
    FhirPublisherWorker,
    DhisProcessorWorker,
    CrmSchedulerWorker,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
