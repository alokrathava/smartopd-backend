import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FollowUpStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  CANCELLED = 'CANCELLED',
}

export enum FollowUpPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

@Entity('follow_ups')
export class FollowUp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', name: 'patient_id' })
  patientId: string;

  @Column({ type: 'varchar', nullable: true, name: 'visit_id' })
  visitId: string;

  @Column({ type: 'varchar', nullable: true, name: 'assigned_to_id' })
  assignedToId: string;

  @Index()
  @Column({ type: 'date', name: 'follow_up_date' })
  followUpDate: Date;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: FollowUpStatus,
    default: FollowUpStatus.PENDING,
  })
  status: FollowUpStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @Column({ type: 'varchar', nullable: true, name: 'completed_by' })
  completedBy: string;

  @Column({ type: 'boolean', default: false, name: 'notification_sent' })
  notificationSent: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'notification_sent_at' })
  notificationSentAt: Date;

  @Column({
    type: 'enum',
    enum: FollowUpPriority,
    default: FollowUpPriority.MEDIUM,
  })
  priority: FollowUpPriority;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
