import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DrugForm {
  TABLET = 'TABLET',
  CAPSULE = 'CAPSULE',
  SYRUP = 'SYRUP',
  INJECTION = 'INJECTION',
  CREAM = 'CREAM',
  DROPS = 'DROPS',
  INHALER = 'INHALER',
  PATCH = 'PATCH',
  OTHER = 'OTHER',
}

export enum Frequency {
  OD = 'OD',
  BD = 'BD',
  TDS = 'TDS',
  QID = 'QID',
  SOS = 'SOS',
  STAT = 'STAT',
  WEEKLY = 'WEEKLY',
}

export enum PrescriptionItemStatus {
  ACTIVE = 'ACTIVE',
  DISPENSED = 'DISPENSED',
  CANCELLED = 'CANCELLED',
}

@Entity('prescription_items')
export class PrescriptionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', name: 'prescription_id' })
  prescriptionId: string;

  @Column({ type: 'varchar', name: 'drug_name' })
  drugName: string;

  @Column({ type: 'varchar', nullable: true, name: 'generic_name' })
  genericName: string;

  @Column({ type: 'enum', enum: DrugForm })
  form: DrugForm;

  @Column({ type: 'varchar', nullable: true })
  strength: string;

  @Column({ type: 'varchar' })
  dose: string;

  @Column({ type: 'enum', enum: Frequency })
  frequency: Frequency;

  @Column({ type: 'varchar', default: 'ORAL' })
  route: string;

  @Column({ type: 'int', nullable: true, name: 'duration_days' })
  durationDays: number;

  @Column({ type: 'int', nullable: true })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({ type: 'boolean', default: true, name: 'is_generic_substitutable' })
  isGenericSubstitutable: boolean;

  @Column({ type: 'enum', enum: PrescriptionItemStatus, default: PrescriptionItemStatus.ACTIVE })
  status: PrescriptionItemStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
