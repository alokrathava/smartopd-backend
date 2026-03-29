import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index,
} from 'typeorm';

export enum ResultStatus {
  NORMAL = 'NORMAL',
  ABNORMAL_HIGH = 'ABNORMAL_HIGH',
  ABNORMAL_LOW = 'ABNORMAL_LOW',
  CRITICAL_HIGH = 'CRITICAL_HIGH',
  CRITICAL_LOW = 'CRITICAL_LOW',
  PENDING = 'PENDING',
}

@Entity('lab_results')
export class LabResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', name: 'lab_order_id' })
  labOrderId: string;

  @Index()
  @Column({ type: 'varchar', name: 'patient_id' })
  patientId: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  /** Component name e.g. "Haemoglobin", "WBC" */
  @Column({ type: 'varchar', length: 200, name: 'component_name' })
  componentName: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'loinc_code' })
  loincCode: string | null;

  @Column({ type: 'varchar', length: 100 })
  value: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'reference_range' })
  referenceRange: string | null;

  @Column({ type: 'enum', enum: ResultStatus, default: ResultStatus.PENDING })
  status: ResultStatus;

  /** FHIR Observation JSON */
  @Column({ type: 'longtext', nullable: true, name: 'fhir_observation' })
  fhirObservation: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'interpretation' })
  interpretation: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
