import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TriageCategory {
  RED = 'RED',
  ORANGE = 'ORANGE',
  YELLOW = 'YELLOW',
  GREEN = 'GREEN',
  BLUE = 'BLUE',
}

@Entity('triages')
export class Triage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', unique: true, name: 'visit_id' })
  visitId: string;

  @Column({ type: 'varchar', name: 'triage_by_id' })
  triageById: string;

  @Column({ type: 'enum', enum: TriageCategory, name: 'triage_category' })
  triageCategory: TriageCategory;

  @Column({ type: 'text', name: 'chief_complaint' })
  chiefComplaint: string;

  @Column({ type: 'text', nullable: true, name: 'triage_notes' })
  triageNotes: string;

  @Column({ type: 'datetime', name: 'triage_at' })
  triageAt: Date;

  @Column({ type: 'varchar', nullable: true, name: 'overridden_by' })
  overriddenBy: string;

  @Column({ type: 'text', nullable: true, name: 'override_reason' })
  overrideReason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
