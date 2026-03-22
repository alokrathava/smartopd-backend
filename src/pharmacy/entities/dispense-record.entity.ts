import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('dispense_records')
export class DispenseRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', name: 'prescription_id' })
  prescriptionId: string;

  @Column({ type: 'varchar', nullable: true, name: 'prescription_item_id' })
  prescriptionItemId: string;

  @Column({ type: 'varchar', name: 'patient_id' })
  patientId: string;

  @Column({ type: 'varchar', name: 'dispensed_by_id' })
  dispensedById: string;

  @Column({ type: 'varchar', name: 'drug_name' })
  drugName: string;

  @Column({ type: 'varchar', nullable: true, name: 'generic_name' })
  genericName: string;

  @Column({ type: 'varchar', nullable: true, name: 'batch_number' })
  batchNumber: string;

  @Column({ type: 'date', nullable: true, name: 'expiry_date' })
  expiryDate: Date;

  @Column({ type: 'int', name: 'quantity_dispensed' })
  quantityDispensed: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'unit_price',
  })
  unitPrice: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    name: 'total_price',
  })
  totalPrice: number;

  @Column({ type: 'datetime', name: 'dispensed_at' })
  dispensedAt: Date;

  @Column({ type: 'boolean', default: false, name: 'otp_verified' })
  otpVerified: boolean;

  @Column({ type: 'datetime', nullable: true, name: 'otp_verified_at' })
  otpVerifiedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int', default: 0, name: 'returned_qty' })
  returnedQty: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
