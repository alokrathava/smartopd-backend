import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum EquipmentCategory {
  DIAGNOSTIC = 'DIAGNOSTIC',
  SURGICAL = 'SURGICAL',
  MONITORING = 'MONITORING',
  IT = 'IT',
  FURNITURE = 'FURNITURE',
  OTHER = 'OTHER',
}

export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  LEASED_OUT = 'LEASED_OUT',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  DECOMMISSIONED = 'DECOMMISSIONED',
}

export enum OwnershipType {
  OWNED = 'OWNED',
  LEASED = 'LEASED',
  RENTAL = 'RENTAL',
}

@Entity('equipment')
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  brand: string;

  @Column({ type: 'varchar', nullable: true })
  model: string;

  @Column({ type: 'varchar', nullable: true, name: 'serial_number' })
  serialNumber: string;

  @Column({ type: 'varchar', nullable: true, name: 'asset_tag' })
  assetTag: string;

  @Column({ type: 'varchar', unique: true, nullable: true, name: 'qr_code' })
  qrCode: string;

  @Column({ type: 'enum', enum: EquipmentCategory })
  category: EquipmentCategory;

  @Column({ type: 'enum', enum: OwnershipType, default: OwnershipType.OWNED, name: 'ownership_type' })
  ownershipType: OwnershipType;

  @Column({ type: 'date', nullable: true, name: 'purchase_date' })
  purchaseDate: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true, name: 'purchase_price' })
  purchasePrice: number;

  @Column({ type: 'varchar', nullable: true })
  location: string;

  @Column({ type: 'enum', enum: EquipmentStatus, default: EquipmentStatus.AVAILABLE })
  status: EquipmentStatus;

  @Column({ type: 'date', nullable: true, name: 'warranty_expires_at' })
  warrantyExpiresAt: Date;

  @Index()
  @Column({ type: 'date', nullable: true, name: 'next_maintenance_due' })
  nextMaintenanceDue: Date;

  @Column({ type: 'int', nullable: true, name: 'maintenance_frequency_days' })
  maintenanceFrequencyDays: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', nullable: true, name: 'photo_url' })
  photoUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
