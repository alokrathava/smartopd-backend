import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';
import { RoomType } from './room.entity';

export enum BedStatus {
  AVAILABLE   = 'AVAILABLE',
  OCCUPIED    = 'OCCUPIED',
  CLEANING    = 'CLEANING',
  RESERVED    = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE',
  BLOCKED     = 'BLOCKED',
}

export const VALID_BED_TRANSITIONS: Record<BedStatus, BedStatus[]> = {
  [BedStatus.AVAILABLE]:   [BedStatus.OCCUPIED, BedStatus.RESERVED, BedStatus.MAINTENANCE, BedStatus.BLOCKED],
  [BedStatus.OCCUPIED]:    [BedStatus.CLEANING],
  [BedStatus.CLEANING]:    [BedStatus.AVAILABLE, BedStatus.MAINTENANCE],
  [BedStatus.RESERVED]:    [BedStatus.OCCUPIED, BedStatus.AVAILABLE],
  [BedStatus.MAINTENANCE]: [BedStatus.AVAILABLE, BedStatus.BLOCKED],
  [BedStatus.BLOCKED]:     [BedStatus.AVAILABLE, BedStatus.MAINTENANCE],
};

@Entity('beds')
export class Bed extends BaseEntity {
  @Column() roomId: string;
  @Column() bedNumber: string;
  @Column({ type: 'varchar', length: 20, default: BedStatus.AVAILABLE }) status: BedStatus;
  @Column({ nullable: true }) currentPatientId?: string;
  @Column({ nullable: true }) currentAdmissionId?: string;
  @Column({ default: false }) hasVentilator: boolean;
  @Column({ default: false }) hasMonitor: boolean;
  @Column({ default: false }) hasCallBell: boolean;
  @Column({ default: false }) hasIvRack: boolean;
  @Column({ default: true }) isActive: boolean;
  @Column({ nullable: true }) notes?: string;

  /** Denormalized RoomType from the parent room for quick filtering */
  @Column({ type: 'varchar', length: 30, nullable: true }) roomType?: RoomType;

  /** Last patient who occupied this bed (uuid) */
  @Column({ type: 'varchar', nullable: true }) lastOccupiedBy?: string | null;

  /** When this bed was last cleaned */
  @Column({ type: 'timestamp', nullable: true }) lastCleanedAt?: Date | null;

  /** Who cleaned this bed last (uuid) */
  @Column({ type: 'varchar', nullable: true }) lastCleanedBy?: string | null;

  /** When cleaning of this bed started */
  @Column({ type: 'timestamp', nullable: true }) cleaningStartedAt?: Date | null;
}
