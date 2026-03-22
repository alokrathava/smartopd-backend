import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

export enum OtStatus {
  BOOKED = 'booked',
  PREOP_CHECK = 'preop_check',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
}

export enum OtUrgency {
  ELECTIVE = 'elective',
  URGENT = 'urgent',
  EMERGENCY = 'emergency',
}

@Entity('ot_bookings')
export class OtBooking extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  patientId: string;

  @Column({ type: 'varchar', nullable: true })
  admissionId?: string;

  @Column({ type: 'varchar' })
  surgeonId: string;

  @Column({ type: 'varchar', nullable: true })
  anaesthetistId?: string;

  @Column({ type: 'varchar' })
  otRoomId: string;

  @Column({ type: 'timestamp' })
  scheduledStart: Date;

  @Column({ type: 'timestamp' })
  scheduledEnd: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualStart?: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualEnd?: Date;

  @Column({ type: 'varchar' })
  procedureName: string;

  @Column({ type: 'simple-array', nullable: true })
  cptCodes?: string[];

  @Column({ type: 'varchar', length: 20, default: OtUrgency.ELECTIVE })
  urgency: OtUrgency;

  @Column({ type: 'varchar', length: 20, default: OtStatus.BOOKED })
  status: OtStatus;

  @Column({ type: 'varchar', nullable: true })
  postOpBedId?: string;

  @Column({ type: 'simple-json', nullable: true })
  preOpChecklist?: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  preOpChecklistCompletedAt?: Date;

  @Column({ type: 'text', nullable: true })
  intraOpNotes?: string;

  @Column({ type: 'text', nullable: true })
  postOpNotes?: string;

  @Column({ type: 'text', nullable: true })
  cancelledReason?: string;
}
