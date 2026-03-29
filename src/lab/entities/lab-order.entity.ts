import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum LabOrderStatus {
  ORDERED = 'ORDERED',
  SENT_TO_LAB = 'SENT_TO_LAB',
  SAMPLE_COLLECTED = 'SAMPLE_COLLECTED',
  PROCESSING = 'PROCESSING',
  RESULTED = 'RESULTED',
  CANCELLED = 'CANCELLED',
}

export enum LabPartner {
  IN_HOUSE = 'IN_HOUSE',
  SRL = 'SRL',
  THYROCARE = 'THYROCARE',
  DR_LAL = 'DR_LAL',
  METROPOLIS = 'METROPOLIS',
}

@Entity('lab_orders')
export class LabOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Index()
  @Column({ type: 'varchar', name: 'patient_id' })
  patientId: string;

  @Index()
  @Column({ type: 'varchar', name: 'visit_id' })
  visitId: string;

  @Column({ type: 'varchar', name: 'ordered_by_id' })
  orderedById: string;

  @Column({ type: 'enum', enum: LabOrderStatus, default: LabOrderStatus.ORDERED })
  status: LabOrderStatus;

  @Column({ type: 'enum', enum: LabPartner, default: LabPartner.IN_HOUSE })
  partner: LabPartner;

  /** Test name e.g. "CBC", "HbA1c", "Lipid Profile" */
  @Column({ type: 'varchar', length: 200, name: 'test_name' })
  testName: string;

  /** LOINC code for interoperability */
  @Column({ type: 'varchar', length: 50, nullable: true, name: 'loinc_code' })
  loincCode: string | null;

  /** Clinical notes / special instructions */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** External order ID from lab partner */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'external_order_id' })
  externalOrderId: string | null;

  /** FHIR ServiceRequest JSON */
  @Column({ type: 'longtext', nullable: true, name: 'fhir_service_request' })
  fhirServiceRequest: string | null;

  /** Urgency */
  @Column({ type: 'varchar', length: 20, default: 'ROUTINE', name: 'urgency' })
  urgency: 'ROUTINE' | 'URGENT' | 'STAT';

  @Column({ type: 'timestamp', nullable: true, name: 'sent_to_lab_at' })
  sentToLabAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'resulted_at' })
  resultedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
