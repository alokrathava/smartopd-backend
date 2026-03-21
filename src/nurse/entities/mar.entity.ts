import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MarStatus {
  SCHEDULED = 'SCHEDULED',
  ADMINISTERED = 'ADMINISTERED',
  HELD = 'HELD',
  MISSED = 'MISSED',
}

@Entity('mar')
export class Mar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', name: 'visit_id' })
  visitId: string;

  @Column({ type: 'varchar', name: 'patient_id' })
  patientId: string;

  @Column({ type: 'varchar', nullable: true, name: 'prescription_item_id' })
  prescriptionItemId: string;

  @Column({ type: 'varchar', name: 'administered_by_id' })
  administeredById: string;

  @Column({ type: 'varchar', name: 'drug_name' })
  drugName: string;

  @Column({ type: 'varchar' })
  dose: string;

  @Column({ type: 'varchar' })
  route: string;

  @Column({ type: 'datetime', name: 'scheduled_at' })
  scheduledAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'administered_at' })
  administeredAt: Date;

  @Column({ type: 'enum', enum: MarStatus, default: MarStatus.SCHEDULED })
  status: MarStatus;

  @Column({ type: 'text', nullable: true, name: 'hold_reason' })
  holdReason: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
