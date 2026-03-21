import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, OneToOne } from 'typeorm';

export enum FacilityType {
  HOSPITAL = 'HOSPITAL',
  CLINIC = 'CLINIC',
  DIAGNOSTIC = 'DIAGNOSTIC',
}

export enum SubscriptionPlan {
  STARTER = 'STARTER',
  GROWTH = 'GROWTH',
  SCALE = 'SCALE',
  ENTERPRISE = 'ENTERPRISE',
}

@Entity('facilities')
export class Facility {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'registration_number' })
  registrationNumber: string;

  @Column({ type: 'enum', enum: FacilityType, default: FacilityType.HOSPITAL })
  type: FacilityType;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pincode: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'gst_number' })
  gstNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'abha_facility_id' })
  abhaFacilityId: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'logo_url' })
  logoUrl: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'enum', enum: SubscriptionPlan, default: SubscriptionPlan.STARTER, name: 'subscription_plan' })
  subscriptionPlan: SubscriptionPlan;

  @Column({ type: 'datetime', nullable: true, name: 'subscription_expires_at' })
  subscriptionExpiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
