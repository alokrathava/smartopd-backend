import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('pharmacy_inventory')
export class PharmacyInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', name: 'drug_name' })
  drugName: string;

  @Column({ type: 'varchar', nullable: true, name: 'generic_name' })
  genericName: string;

  @Column({ type: 'varchar' })
  form: string;

  @Column({ type: 'varchar', nullable: true })
  strength: string;

  @Column({ type: 'varchar', nullable: true })
  manufacturer: string;

  @Column({ type: 'varchar', name: 'batch_number' })
  batchNumber: string;

  @Index()
  @Column({ type: 'date', name: 'expiry_date' })
  expiryDate: Date;

  @Column({ type: 'int', default: 0, name: 'quantity_in_stock' })
  quantityInStock: number;

  @Column({ type: 'int', default: 10, name: 'reorder_level' })
  reorderLevel: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price' })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  mrp: number;

  @Column({ type: 'varchar', nullable: true, name: 'hsn_code' })
  hsnCode: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 18,
    name: 'gst_percent',
  })
  gstPercent: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true, name: 'storage_location' })
  storageLocation: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
