import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum VisitType {
  OPD = 'OPD',
  EMERGENCY = 'EMERGENCY',
  FOLLOW_UP = 'FOLLOW_UP',
  TELE = 'TELE',
}

export enum VisitStatus {
  REGISTERED = 'REGISTERED',
  WAITING = 'WAITING',
  WITH_NURSE = 'WITH_NURSE',
  WITH_DOCTOR = 'WITH_DOCTOR',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  WAIVED = 'WAIVED',
}

@Entity('visits')
export class Visit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', unique: false, name: 'visit_number' })
  visitNumber: string;

  @Column({ type: 'varchar', name: 'patient_id' })
  patientId: string;

  @Column({ type: 'varchar', nullable: true, name: 'doctor_id' })
  doctorId: string;

  @Column({ type: 'varchar', name: 'registered_by_id' })
  registeredById: string;

  @Column({ type: 'enum', enum: VisitType, name: 'visit_type' })
  visitType: VisitType;

  @Column({ type: 'enum', enum: VisitStatus, default: VisitStatus.REGISTERED })
  status: VisitStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'scheduled_at' })
  scheduledAt: Date;

  @Column({ type: 'timestamp', name: 'checked_in_at', nullable: true })
  checkedInAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'nurse_seen_at' })
  nurseSeenAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'doctor_seen_at' })
  doctorSeenAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'int', name: 'token_number', default: 0 })
  tokenNumber: number;

  @Column({ type: 'text', nullable: true, name: 'chief_complaint' })
  chiefComplaint: string;

  @Column({ type: 'text', nullable: true, name: 'visit_notes' })
  visitNotes: string;

  @Column({ type: 'date', nullable: true, name: 'follow_up_date' })
  followUpDate: Date;

  @Column({ type: 'text', nullable: true, name: 'follow_up_instructions' })
  followUpInstructions: string;

  @Column({ type: 'boolean', default: false, name: 'is_tele_consult' })
  isTeleConsult: boolean;

  @Column({ type: 'varchar', nullable: true, name: 'tele_consult_link' })
  teleConsultLink: string;

  @Column({ type: 'text', nullable: true, name: 'fhir_encounter_json' })
  fhirEncounterJson: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'total_amount',
  })
  totalAmount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'paid_amount',
  })
  paidAmount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    name: 'payment_status',
  })
  paymentStatus: PaymentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
