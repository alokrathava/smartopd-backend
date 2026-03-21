import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', nullable: true, name: 'facility_id' })
  facilityId: string | null;

  @Column({ type: 'varchar', length: 500 })
  token: string;

  @Column({ type: 'datetime', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  revoked: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'ip_address' })
  ipAddress: string;

  @Column({ type: 'varchar', length: 300, nullable: true, name: 'user_agent' })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
