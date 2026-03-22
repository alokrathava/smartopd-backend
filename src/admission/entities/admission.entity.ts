import { Entity, Column, Index, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

export enum AdmissionStatus {
  PENDING            = 'pending',
  ACTIVE             = 'active',
  DISCHARGE_PLANNED  = 'discharge_planned',
  DISCHARGED         = 'discharged',
  DAMA               = 'dama',
  EXPIRED            = 'expired',
  CANCELLED          = 'cancelled',
}

export enum AdmissionType {
  ELECTIVE    = 'elective',
  EMERGENCY   = 'emergency',
  DAY_CARE    = 'day_care',
  OBSERVATION = 'observation',
}

export enum DischargeType {
  REGULAR  = 'regular',
  DAMA     = 'dama',
  EXPIRED  = 'expired',
  TRANSFER = 'transfer',
}

@Entity('patient_admissions')
export class Admission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', nullable: true, name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  admissionNumber: string;

  @Column({ type: 'varchar' })
  patientId: string;

  @Column({ type: 'varchar', nullable: true })
  sourceVisitId?: string | null;

  @Column({ type: 'varchar' })
  admittingDoctorId: string;

  @Column({ type: 'varchar', nullable: true })
  primaryNurseId?: string | null;

  @Column({ type: 'varchar' })
  bedId: string;

  @Column({ type: 'varchar' })
  wardId: string;

  @Column({ type: 'varchar', length: 30, default: AdmissionStatus.PENDING })
  status: AdmissionStatus;

  @Column({ type: 'varchar', length: 20 })
  admissionType: AdmissionType;

  @Column({ type: 'varchar' })
  chiefComplaint: string;

  @Column({ type: 'simple-array', nullable: true })
  icd10Codes?: string[];

  @Column({ type: 'varchar', nullable: true })
  nhcxPreAuthId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  nhcxPreAuthStatus?: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  nhcxApprovedAmount?: number | null;

  @Column({ type: 'varchar', nullable: true })
  attendantName?: string | null;

  @Column({ type: 'varchar', nullable: true })
  attendantPhone?: string | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  wristbandNumber?: string | null;

  @Column({ type: 'date', nullable: true })
  expectedDischargeDate?: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  admittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  dischargeInitiatedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  dischargedAt?: Date | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  dischargeType?: DischargeType | null;

  @Column({ type: 'text', nullable: true })
  dischargeNotes?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  fhirDischargePublishedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
