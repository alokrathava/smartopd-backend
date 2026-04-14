import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum OtpPurpose {
  LOGIN = 'LOGIN',
  PHARMACY_DISPENSE = 'PHARMACY_DISPENSE',
  PATIENT_CONSENT = 'PATIENT_CONSENT',
}

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, name: 'facility_id' })
  facilityId: string | null;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  code: string; // hashed

  @Column({ type: 'enum', enum: OtpPurpose, default: OtpPurpose.LOGIN })
  purpose: OtpPurpose;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  used: boolean;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
