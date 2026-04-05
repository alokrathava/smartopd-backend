import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NhcxClaimType {
  OPD = 'OPD',
  IPD = 'IPD',
  SURGERY = 'SURGERY',
  DAYCARE = 'DAYCARE',
  PRE_AUTH = 'PRE_AUTH',
}

export enum NhcxClaimStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  QUERY_RAISED = 'QUERY_RAISED',
  APPROVED = 'APPROVED',
  PARTIALLY_APPROVED = 'PARTIALLY_APPROVED',
  DENIED = 'DENIED',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
}

@Entity('nhcx_claim_records')
export class NhcxClaimRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Index()
  @Column({ type: 'varchar', name: 'patient_id' })
  patientId: string;

  @Column({ type: 'varchar', nullable: true, name: 'visit_id' })
  visitId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'admission_id' })
  admissionId: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'bill_id' })
  billId: string | null;

  @Column({ type: 'enum', enum: NhcxClaimType, name: 'claim_type' })
  claimType: NhcxClaimType;

  @Column({
    type: 'enum',
    enum: NhcxClaimStatus,
    default: NhcxClaimStatus.DRAFT,
  })
  status: NhcxClaimStatus;

  /** NHCX claim reference number returned on submission */
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'nhcx_claim_id',
  })
  nhcxClaimId: string | null;

  /** Insurance company (payer) */
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'payer_name' })
  payerName: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'policy_number',
  })
  policyNumber: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'member_id' })
  memberId: string | null;

  /** Claimed amount in INR */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'claimed_amount',
  })
  claimedAmount: number | null;

  /** Approved amount in INR (set on approval) */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'approved_amount',
  })
  approvedAmount: number | null;

  /** FHIR ClaimBundle JSON submitted to NHCX */
  @Column({ type: 'longtext', nullable: true, name: 'fhir_bundle' })
  fhirBundle: string | null;

  /** NHCX response payload */
  @Column({ type: 'longtext', nullable: true, name: 'nhcx_response' })
  nhcxResponse: string | null;

  @Column({ type: 'text', nullable: true, name: 'denial_reason' })
  denialReason: string | null;

  @Column({ type: 'text', nullable: true, name: 'query_text' })
  queryText: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'submitted_at' })
  submittedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'resolved_at' })
  resolvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
