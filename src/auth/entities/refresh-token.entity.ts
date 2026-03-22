import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', nullable: true, name: 'facility_id' })
  facilityId: string | null;

  /**
   * Unique selector — stored in plain text so we can look up the row in O(1).
   * The raw refresh token sent to the client is:  `<selector>.<secret>`
   * Only the secret portion is bcrypt-hashed and stored in `token`.
   */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 36, unique: true })
  selector: string;

  /** bcrypt hash of the secret portion of the refresh token */
  @Column({ type: 'varchar', length: 255 })
  token: string;

  @Column({ type: 'datetime', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  revoked: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'ip_address' })
  ipAddress: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'user_agent' })
  userAgent: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
