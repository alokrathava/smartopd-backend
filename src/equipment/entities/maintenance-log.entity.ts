import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  CALIBRATION = 'CALIBRATION',
  INSPECTION = 'INSPECTION',
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('maintenance_logs')
export class MaintenanceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', name: 'equipment_id' })
  equipmentId: string;

  @Column({ type: 'varchar', nullable: true, name: 'performed_by_id' })
  performedById: string;

  @Column({ type: 'enum', enum: MaintenanceType, name: 'maintenance_type' })
  maintenanceType: MaintenanceType;

  @Column({ type: 'date', name: 'scheduled_date' })
  scheduledDate: Date;

  @Column({ type: 'date', nullable: true, name: 'performed_date' })
  performedDate: Date;

  @Column({ type: 'varchar', nullable: true, name: 'vendor_name' })
  vendorName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true, name: 'next_due_date' })
  nextDueDate: Date;

  @Column({ type: 'enum', enum: MaintenanceStatus, default: MaintenanceStatus.SCHEDULED })
  status: MaintenanceStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
