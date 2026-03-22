import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

export enum PreAuthStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  QUERY_RAISED = 'query_raised',
  APPROVED = 'approved',
  APPROVED_ENHANCED = 'approved_enhanced',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('insurance_pre_auths')
export class InsurancePreAuth extends BaseEntity {
  @Column({ type: 'varchar' })
  patientId: string;

  @Column({ type: 'varchar', nullable: true })
  admissionId?: string;

  @Column({ type: 'varchar', nullable: true })
  visitId?: string;

  @Column({ type: 'varchar' })
  insurerName: string;

  @Column({ type: 'varchar', nullable: true })
  policyNumber?: string;

  @Column({ type: 'varchar', nullable: true })
  tpaName?: string;

  @Column({ type: 'text', nullable: true })
  diagnosisCodes?: string; // JSON string

  @Column({ type: 'text', nullable: true })
  requestedProcedures?: string; // JSON string

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  estimatedCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  approvedAmount?: number;

  @Column({ type: 'varchar', length: 30, default: PreAuthStatus.DRAFT })
  status: PreAuthStatus;

  @Column({ type: 'varchar', nullable: true })
  referenceNumber?: string;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  respondedAt?: Date;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'text', nullable: true })
  insurerResponseJson?: string;

  @Column({ type: 'varchar' })
  requestedById: string;
}
