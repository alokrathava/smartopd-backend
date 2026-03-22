import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

export enum ShiftType {
  DAY = 'day',
  EVENING = 'evening',
  NIGHT = 'night',
  ON_CALL = 'on_call',
  OVERTIME = 'overtime',
}

export enum ShiftStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABSENT = 'absent',
  SWAPPED = 'swapped',
}

// Class kept as StaffRoster to avoid breaking app.module.ts imports.
// Table name changed to staff_shifts per TRD v1.1.
@Entity('staff_shifts')
export class StaffRoster extends BaseEntity {
  @Column({ type: 'varchar' })
  staffId: string;

  @Column({ type: 'varchar' })
  staffRole: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  wardId?: string;

  @Column({ type: 'varchar', length: 20 })
  shiftType: ShiftType;

  @Column({ type: 'date' })
  shiftDate: string;

  @Column({ type: 'timestamp' })
  startAt: Date;

  @Column({ type: 'timestamp' })
  endAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualStartAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualEndAt?: Date;

  @Column({ type: 'varchar', length: 20, default: ShiftStatus.SCHEDULED })
  status: ShiftStatus;

  @Column({ type: 'varchar', nullable: true })
  swappedWithStaffId?: string;

  @Column({ type: 'varchar', nullable: true })
  approvedBy?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
