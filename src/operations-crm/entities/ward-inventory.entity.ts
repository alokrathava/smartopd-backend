import { Entity, Column, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

@Entity('ward_inventory')
@Unique(['facilityId', 'wardId', 'consumableItemId'])
export class WardInventory extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  wardId: string;

  @Column({ type: 'varchar' })
  consumableItemId: string;

  @Column({ type: 'int', default: 0 })
  currentStock: number;

  @Column({ type: 'int', default: 10 })
  reorderLevel: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRestockedAt?: Date;

  @Column({ type: 'int', nullable: true })
  lastRestockedQuantity?: number;
}
