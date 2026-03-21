import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Index()
  @Column({ type: 'varchar', nullable: true, name: 'facility_id' })
  facilityId: string;

  @Index()
  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', nullable: true, name: 'user_role' })
  userRole: string;

  @Column({ type: 'varchar' })
  action: string;

  @Column({ type: 'varchar' })
  resource: string;

  @Column({ type: 'varchar', nullable: true, name: 'resource_id' })
  resourceId: string;

  @Column({ type: 'longtext', nullable: true })
  payload: string;

  @Column({ type: 'varchar', nullable: true, name: 'ip_address' })
  ipAddress: string;

  @Column({ type: 'varchar', nullable: true, name: 'user_agent' })
  userAgent: string;

  @Column({ type: 'int', nullable: true, name: 'status_code' })
  statusCode: number;

  @Column({ type: 'int', nullable: true })
  duration: number;

  @Index()
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  timestamp: Date;
}
