import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum ItemType {
  CONSULTATION = 'CONSULTATION',
  MEDICINE = 'MEDICINE',
  PROCEDURE = 'PROCEDURE',
  DIAGNOSTIC = 'DIAGNOSTIC',
  MISC = 'MISC',
}

@Entity('bill_items')
export class BillItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', name: 'bill_id' })
  billId: string;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'enum', enum: ItemType, name: 'item_type' })
  itemType: ItemType;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price' })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    name: 'gst_percent',
  })
  gstPercent: number;

  @Column({ type: 'varchar', nullable: true, name: 'hsn_sac_code' })
  hsnSacCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
