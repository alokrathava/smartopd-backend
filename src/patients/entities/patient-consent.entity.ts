import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum ConsentType {
  TREATMENT = 'TREATMENT',
  DATA_SHARING = 'DATA_SHARING',
  ABHA_LINK = 'ABHA_LINK',
  RESEARCH = 'RESEARCH',
}

@Entity('patient_consents')
export class PatientConsent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', name: 'patient_id' })
  patientId: string;

  @Column({ type: 'enum', enum: ConsentType, name: 'consent_type' })
  consentType: ConsentType;

  @Column({ type: 'datetime', name: 'consent_given_at' })
  consentGivenAt: Date;

  @Column({ type: 'varchar', nullable: true, name: 'consent_given_by' })
  consentGivenBy: string;

  @Column({ type: 'boolean', default: false, name: 'is_guardian' })
  isGuardian: boolean;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'guardian_relation',
  })
  guardianRelation: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'ip_address' })
  ipAddress: string;

  @Column({ type: 'datetime', nullable: true, name: 'revoked_at' })
  revokedAt: Date;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'document_url',
  })
  documentUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
