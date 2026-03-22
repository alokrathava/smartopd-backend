import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

export enum RoomType {
  GENERAL_WARD = 'GENERAL_WARD',
  PRIVATE_ROOM = 'PRIVATE_ROOM',
  SEMI_PRIVATE = 'SEMI_PRIVATE',
  ICU = 'ICU',
  HDU = 'HDU',
  NICU = 'NICU',
  OT = 'OT',
  PREOP = 'PREOP',
  POSTOP = 'POSTOP',
  CONSULT = 'CONSULT',
  PROCEDURE = 'PROCEDURE',
  ISOLATION = 'ISOLATION',
}

@Entity('rooms')
export class Room extends BaseEntity {
  @Column() name: string;
  @Column({ type: 'varchar', length: 30 }) type: RoomType;
  @Column({ nullable: true }) building?: string;
  @Column({ nullable: true }) floor?: string;
  @Column({ nullable: true }) ward?: string;
  @Column({ default: 1 }) capacity: number;
  @Column({ default: true }) isActive: boolean;
  @Column({ nullable: true }) notes?: string;

  /** Room feature flags e.g. ["oxygen", "ventilator", "crash_cart"] */
  @Column({ type: 'simple-array', nullable: true }) features?: string[];
}
