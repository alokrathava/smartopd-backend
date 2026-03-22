import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { Role } from '../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true, name: 'facility_id' })
  facilityId: string | null;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  @Column({ type: 'enum', enum: Role, default: Role.RECEPTIONIST })
  role: Role;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'datetime', nullable: true, name: 'last_login_at' })
  lastLoginAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'invite_token' })
  inviteToken: string;

  @Column({ type: 'datetime', nullable: true, name: 'invite_expires_at' })
  inviteExpiresAt: Date;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'profile_photo' })
  profilePhoto: string;

  @Column({ type: 'text', nullable: true, name: 'doctor_profile' })
  doctorProfile: string; // JSON: { specialization, regNumber, qualification }

  @Column({ type: 'text', nullable: true, name: 'nurse_profile' })
  nurseProfile: string; // JSON: { ward, shift }

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
