import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum NotificationChannel {
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
}

export enum NotificationStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

@Entity('notification_logs')
export class NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'varchar' })
  recipient: string;

  @Column({ type: 'varchar', nullable: true, name: 'template_code' })
  templateCode: string;

  @Column({ type: 'varchar', nullable: true })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.QUEUED })
  status: NotificationStatus;

  @Column({ type: 'varchar', nullable: true, name: 'external_id' })
  externalId: string;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage: string;

  @Column({ type: 'datetime', nullable: true, name: 'sent_at' })
  sentAt: Date;

  @Column({ type: 'varchar', nullable: true, name: 'related_entity_type' })
  relatedEntityType: string;

  @Column({ type: 'varchar', nullable: true, name: 'related_entity_id' })
  relatedEntityId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
