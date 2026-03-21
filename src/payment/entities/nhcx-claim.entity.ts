import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NhcxStatus {
  SUBMITTED = 'SUBMITTED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SETTLED = 'SETTLED',
}

@Entity('nhcx_claims')
export class NhcxClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', name: 'visit_id' })
  visitId: string;

  @Column({ type: 'varchar', name: 'bill_id' })
  billId: string;

  @Column({ type: 'varchar', name: 'patient_id' })
  patientId: string;

  @Column({ type: 'varchar', name: 'insurer_name' })
  insurerName: string;

  @Column({ type: 'varchar', nullable: true, name: 'policy_number' })
  policyNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'claim_amount' })
  claimAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'approved_amount' })
  approvedAmount: number;

  @Column({ type: 'varchar', nullable: true, name: 'nhcx_claim_id' })
  nhcxClaimId: string;

  @Column({ type: 'enum', enum: NhcxStatus, default: NhcxStatus.PENDING, name: 'nhcx_status' })
  nhcxStatus: NhcxStatus;

  @Column({ type: 'datetime', name: 'submitted_at' })
  submittedAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'settled_at' })
  settledAt: Date;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string;

  @Column({ type: 'text', nullable: true, name: 'nhcx_response_json' })
  nhcxResponseJson: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
