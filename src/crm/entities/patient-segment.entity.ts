import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('patient_segments')
export class PatientSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text' })
  criteria: string;

  @Column({ type: 'int', default: 0, name: 'patient_count' })
  patientCount: number;

  @Column({ type: 'datetime', nullable: true, name: 'last_refreshed_at' })
  lastRefreshedAt: Date;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
