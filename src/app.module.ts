import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Feature Modules
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PatientsModule } from './patients/patients.module';
import { VisitsModule } from './visits/visits.module';
import { NurseModule } from './nurse/nurse.module';
import { DoctorModule } from './doctor/doctor.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { EquipmentModule } from './equipment/equipment.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';
import { CrmModule } from './crm/crm.module';
import { AuditModule } from './audit/audit.module';
import { ReportsModule } from './reports/reports.module';
import { RoomModule } from './room/room.module';
import { AdmissionModule } from './admission/admission.module';
import { OtModule } from './ot/ot.module';
import { OperationsCrmModule } from './operations-crm/operations-crm.module';
import { AbdmModule } from './abdm/abdm.module';
import { NhcxModule } from './nhcx/nhcx.module';
import { LabModule } from './lab/lab.module';
import { FhirModule } from './fhir/fhir.module';

// Infrastructure Modules
import { RedisModule } from './redis/redis.module';
import { GatewayModule } from './gateway/gateway.module';
import { QueueModule } from './queue/queue.module';

// Entities
import { User } from './users/entities/user.entity';
import { Facility } from './users/entities/facility.entity';
import { FacilitySettings } from './users/entities/facility-settings.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { Otp } from './auth/entities/otp.entity';
import { Patient } from './patients/entities/patient.entity';
import { PatientConsent } from './patients/entities/patient-consent.entity';
import { Visit } from './visits/entities/visit.entity';
import { Vitals } from './nurse/entities/vitals.entity';
import { Triage } from './nurse/entities/triage.entity';
import { Mar } from './nurse/entities/mar.entity';
import { Consultation } from './doctor/entities/consultation.entity';
import { Prescription } from './doctor/entities/prescription.entity';
import { PrescriptionItem } from './doctor/entities/prescription-item.entity';
import { Icd10 } from './doctor/entities/icd10.entity';
import { DispenseRecord } from './pharmacy/entities/dispense-record.entity';
import { PharmacyInventory } from './pharmacy/entities/pharmacy-inventory.entity';
import { Equipment } from './equipment/entities/equipment.entity';
import { EquipmentLease } from './equipment/entities/equipment-lease.entity';
import { MaintenanceLog } from './equipment/entities/maintenance-log.entity';
import { Bill } from './payment/entities/bill.entity';
import { BillItem } from './payment/entities/bill-item.entity';
import { PaymentTransaction } from './payment/entities/payment-transaction.entity';
import { NhcxClaim } from './payment/entities/nhcx-claim.entity';
import { NotificationLog } from './notification/entities/notification-log.entity';
import { NotificationTemplate } from './notification/entities/notification-template.entity';
import { FollowUp } from './crm/entities/follow-up.entity';
import { PatientSegment } from './crm/entities/patient-segment.entity';
import { CrmCampaign } from './crm/entities/crm-campaign.entity';
import { AuditLog } from './audit/entities/audit-log.entity';
import { Room } from './room/entities/room.entity';
import { Bed } from './room/entities/bed.entity';
import { HousekeepingLog } from './room/entities/housekeeping-log.entity';
import { Admission } from './admission/entities/admission.entity';
import { WardRound } from './admission/entities/ward-round.entity';
import { WardRoundStop } from './admission/entities/ward-round-stop.entity';
import { DischargeSummary } from './admission/entities/discharge-summary.entity';
import { OtBooking } from './ot/entities/ot-booking.entity';
import { StaffRoster } from './operations-crm/entities/staff-roster.entity';
import { InsurancePreAuth } from './operations-crm/entities/insurance-pre-auth.entity';
import { ConsumableItem } from './operations-crm/entities/consumable-item.entity';
import { WardInventory } from './operations-crm/entities/ward-inventory.entity';
import { ConsumableConsumption } from './operations-crm/entities/consumable-consumption.entity';
import { AbdmRecord } from './abdm/entities/abdm-record.entity';
import { NhcxClaimRecord } from './nhcx/entities/nhcx-claim-record.entity';
import { LabOrder } from './lab/entities/lab-order.entity';
import { LabResult } from './lab/entities/lab-result.entity';

@Module({
  imports: [
    // Core config — available globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Events — available globally
    EventEmitterModule.forRoot(),

    // Cron scheduler for periodic tasks
    ScheduleModule.forRoot(),

    // HTTP client for external API calls
    HttpModule,

    // Rate limiting — 100 requests / 60 seconds per IP globally
    // Individual routes can override with @Throttle()
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60000),
          limit: configService.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'smartopd'),
        entities: [
          User, Facility, FacilitySettings,
          RefreshToken, Otp,
          Patient, PatientConsent,
          Visit,
          Vitals, Triage, Mar,
          Consultation, Prescription, PrescriptionItem, Icd10,
          DispenseRecord, PharmacyInventory,
          Equipment, EquipmentLease, MaintenanceLog,
          Bill, BillItem, PaymentTransaction, NhcxClaim,
          NotificationLog, NotificationTemplate,
          FollowUp, PatientSegment, CrmCampaign,
          AuditLog,
          Room, Bed, HousekeepingLog,
          Admission, WardRound, WardRoundStop, DischargeSummary,
          OtBooking,
          StaffRoster, InsurancePreAuth, ConsumableItem, WardInventory, ConsumableConsumption,
          AbdmRecord,
          NhcxClaimRecord,
          LabOrder, LabResult,
        ],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') === 'development',
        migrations: ['dist/migrations/*.js'],
        migrationsRun: configService.get<string>('NODE_ENV') === 'production',
      }),
    }),

    // Infrastructure
    RedisModule,
    GatewayModule,
    QueueModule,

    // Feature Modules
    UsersModule,
    AuthModule,
    PatientsModule,
    VisitsModule,
    NurseModule,
    DoctorModule,
    PharmacyModule,
    EquipmentModule,
    PaymentModule,
    NotificationModule,
    CrmModule,
    AuditModule,
    ReportsModule,
    RoomModule,
    AdmissionModule,
    OtModule,
    OperationsCrmModule,
    AbdmModule,
    NhcxModule,
    LabModule,
    FhirModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
