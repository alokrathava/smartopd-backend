import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

@Entity('consumable_items')
export class ConsumableItem extends BaseEntity {
  @Column({ type: 'varchar' })
  itemCode: string;

  @Column({ type: 'varchar' })
  itemName: string;

  // e.g. 'SURGICAL', 'MEDICATION', 'PPE', 'DRESSING'
  @Column({ type: 'varchar' })
  category: string;

  // e.g. 'piece', 'box', 'vial'
  @Column({ type: 'varchar' })
  unit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitCost: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
