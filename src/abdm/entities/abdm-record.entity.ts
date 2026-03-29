import {
  Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum AbdmFlowType {
  M1_ABHA_CREATION = 'M1_ABHA_CREATION',
  M2_KYC_LINK = 'M2_KYC_LINK',
  M3_HIU_CONSENT = 'M3_HIU_CONSENT',
}

export enum AbdmStatus {
  INITIATED = 'INITIATED',
  OTP_SENT = 'OTP_SENT',
  OTP_VERIFIED = 'OTP_VERIFIED',
  LINKED = 'LINKED',
  CONSENT_REQUESTED = 'CONSENT_REQUESTED',
  CONSENT_GRANTED = 'CONSENT_GRANTED',
  CONSENT_DENIED = 'CONSENT_DENIED',
  FAILED = 'FAILED',
}

@Entity('abdm_records')
export class AbdmRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Index()
  @Column({ type: 'varchar', name: 'patient_id' })
  patientId: string;

  @Column({ type: 'enum', enum: AbdmFlowType, name: 'flow_type' })
  flowType: AbdmFlowType;

  @Column({ type: 'enum', enum: AbdmStatus, default: AbdmStatus.INITIATED })
  status: AbdmStatus;

  /** ABHA number issued after M1 */
  @Column({ type: 'varchar', length: 30, nullable: true, name: 'abha_number' })
  abhaNumber: string | null;

  /** ABHA address (health ID) e.g. name@abdm */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'abha_address' })
  abhaAddress: string | null;

  /** Txn ID returned by ABDM gateway — used for OTP verification */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'txn_id' })
  txnId: string | null;

  /** Consent artefact ID from M3 flow */
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'consent_artefact_id' })
  consentArtefactId: string | null;

  /** ABDM access token for data pull (encrypted at rest) */
  @Column({ type: 'text', nullable: true, name: 'access_token_encrypted' })
  accessTokenEncrypted: string | null;

  /** Raw response from ABDM gateway (for debugging) */
  @Column({ type: 'longtext', nullable: true, name: 'raw_response' })
  rawResponse: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'error_code' })
  errorCode: string | null;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
