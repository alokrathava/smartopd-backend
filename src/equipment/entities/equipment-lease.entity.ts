import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum PatientLeaseStatus {
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
}

export enum EquipmentCondition {
  GOOD = 'GOOD',
  DAMAGED = 'DAMAGED',
  MISSING = 'MISSING',
}

@Entity('equipment_leases')
export class EquipmentLease {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', name: 'equipment_id' })
  equipmentId: string;

  @Column({ type: 'varchar', name: 'patient_id' })
  patientId: string;

  @Column({ type: 'varchar', nullable: true, name: 'visit_id' })
  visitId: string;

  @Column({ type: 'varchar', name: 'issued_by_id' })
  issuedById: string;

  @Column({ type: 'timestamp', name: 'issued_at' })
  issuedAt: Date;

  @Index()
  @Column({ type: 'date', name: 'due_date' })
  dueDate: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'returned_at' })
  returnedAt: Date;

  @Column({
    type: 'enum',
    enum: EquipmentCondition,
    nullable: true,
    name: 'returned_condition',
  })
  returnedCondition: EquipmentCondition;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'deposit_amount',
  })
  depositAmount: number;

  @Column({ type: 'varchar', nullable: true, name: 'deposit_mode' })
  depositMode: string;

  @Column({ type: 'boolean', default: false, name: 'deposit_settled' })
  depositSettled: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: PatientLeaseStatus,
    default: PatientLeaseStatus.ACTIVE,
  })
  status: PatientLeaseStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
