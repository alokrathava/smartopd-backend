import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ward_round_stops')
export class WardRoundStop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar' })
  wardRoundId: string;

  @Column({ type: 'varchar' })
  admissionId: string;

  @Column({ type: 'varchar' })
  bedId: string;

  @Column({ type: 'varchar' })
  patientId: string;

  @Column({ type: 'int', default: 0 })
  stopOrder: number;

  /** S in SOAP */
  @Column({ type: 'text', nullable: true })
  subjectiveNotes?: string | null;

  /** O in SOAP */
  @Column({ type: 'text', nullable: true })
  objectiveNotes?: string | null;

  /** A in SOAP */
  @Column({ type: 'text', nullable: true })
  assessmentNotes?: string | null;

  /** P in SOAP */
  @Column({ type: 'text', nullable: true })
  planNotes?: string | null;

  /** Snapshot of vitals at time of stop */
  @Column({ type: 'simple-json', nullable: true })
  vitalSummary?: Record<string, unknown> | null;

  /** Flag for escalation */
  @Column({ type: 'boolean', default: false })
  flagged: boolean;

  @Column({ type: 'text', nullable: true })
  flagReason?: string | null;

  @Column({ type: 'timestamp' })
  conductedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
