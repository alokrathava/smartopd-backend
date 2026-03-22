import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

export enum HousekeepingStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED   = 'COMPLETED',
  OVERDUE     = 'OVERDUE',
}

@Entity('housekeeping_logs')
export class HousekeepingLog extends BaseEntity {
  @Column() bedId: string;
  @Column({ type: 'timestamp' }) startedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) completedAt?: Date;
  @Column({ nullable: true }) completedById?: string;
  @Column({ type: 'varchar', length: 20, default: HousekeepingStatus.IN_PROGRESS }) status: HousekeepingStatus;
  @Column({ default: 30 }) slaMinutes: number;
  @Column({ nullable: true }) notes?: string;
}
