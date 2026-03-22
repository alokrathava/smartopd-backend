import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ward_rounds')
export class WardRound {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar' })
  admissionId: string;

  @Column({ type: 'varchar' })
  conductedById: string;

  @Column({ type: 'timestamp' })
  conductedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  wardId?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
