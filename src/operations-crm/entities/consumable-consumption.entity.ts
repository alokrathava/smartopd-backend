import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

@Entity('consumable_consumptions')
export class ConsumableConsumption extends BaseEntity {
  @Index()
  @Column({ type: 'varchar' })
  wardId: string;

  @Column({ type: 'varchar', nullable: true })
  admissionId?: string; // for cost attribution

  @Column({ type: 'varchar' })
  consumableItemId: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'varchar' })
  usedBy: string; // staff who dispensed

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  usedAt: Date;

  @Column({ type: 'varchar', nullable: true })
  purpose?: string;
}
