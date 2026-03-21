import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('vitals')
export class Vitals {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', name: 'visit_id' })
  visitId: string;

  @Column({ type: 'varchar', name: 'patient_id' })
  patientId: string;

  @Column({ type: 'varchar', name: 'recorded_by_id' })
  recordedById: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'temperature_celsius' })
  temperatureCelsius: number;

  @Column({ type: 'varchar', nullable: true, name: 'temperature_site' })
  temperatureSite: string;

  @Column({ type: 'int', nullable: true, name: 'pulse_bpm' })
  pulseBpm: number;

  @Column({ type: 'int', nullable: true, name: 'respiratory_rate' })
  respiratoryRate: number;

  @Column({ type: 'int', nullable: true, name: 'systolic_bp' })
  systolicBp: number;

  @Column({ type: 'int', nullable: true, name: 'diastolic_bp' })
  diastolicBp: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true, name: 'sp_o2' })
  spO2: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, name: 'height_cm' })
  heightCm: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, name: 'weight_kg' })
  weightKg: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  bmi: number;

  @Column({ type: 'int', nullable: true, name: 'pain_score' })
  painScore: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true, name: 'blood_glucose' })
  bloodGlucose: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'boolean', default: false, name: 'is_critical' })
  isCritical: boolean;

  @Column({ type: 'text', nullable: true, name: 'critical_flags' })
  criticalFlags: string;

  @Column({ type: 'datetime', name: 'recorded_at' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
