import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationChannel } from './notification-log.entity';

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @Column({ type: 'varchar', default: 'en' })
  language: string;

  @Column({ type: 'varchar', nullable: true })
  subject: string;

  @Column({ type: 'text', name: 'body_template' })
  bodyTemplate: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
