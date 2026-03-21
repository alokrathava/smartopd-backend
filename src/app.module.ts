import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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

// Import ALL entities
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
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
        ],
        synchronize: true, // ⚠️ disable in production
      }),
    }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
