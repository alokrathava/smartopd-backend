import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum PrescriptionStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  PARTIALLY_DISPENSED = 'PARTIALLY_DISPENSED',
  FULLY_DISPENSED = 'FULLY_DISPENSED',
}

@Entity('prescriptions')
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', name: 'visit_id' })
  visitId: string;

  @Column({ type: 'varchar', nullable: true, name: 'consultation_id' })
  consultationId: string;

  @Column({ type: 'varchar', name: 'patient_id', nullable: true })
  patientId: string;

  @Column({ type: 'varchar', name: 'prescribed_by_id' })
  prescribedById: string;

  @Column({ type: 'date', name: 'prescription_date' })
  prescriptionDate: Date;

  @Column({
    type: 'enum',
    enum: PrescriptionStatus,
    default: PrescriptionStatus.DRAFT,
  })
  status: PrescriptionStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'text',
    nullable: true,
    name: 'fhir_medication_request_json',
  })
  fhirMedicationRequestJson: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
