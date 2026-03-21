import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('crm_campaigns')
export class CrmCampaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true, name: 'segment_id' })
  segmentId: string;

  @Column({ type: 'varchar' })
  channel: string;

  @Column({ type: 'varchar', nullable: true, name: 'template_code' })
  templateCode: string;

  @Column({ type: 'datetime', nullable: true, name: 'scheduled_at' })
  scheduledAt: Date;

  @Column({ type: 'datetime', nullable: true, name: 'sent_at' })
  sentAt: Date;

  @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column({ type: 'int', default: 0, name: 'total_recipients' })
  totalRecipients: number;

  @Column({ type: 'int', default: 0, name: 'sent_count' })
  sentCount: number;

  @Column({ type: 'int', default: 0, name: 'failed_count' })
  failedCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
