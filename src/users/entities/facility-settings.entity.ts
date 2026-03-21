import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('facility_settings')
export class FacilitySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', length: 10, default: '09:00', name: 'opd_start_time' })
  opdStartTime: string;

  @Column({ type: 'varchar', length: 10, default: '18:00', name: 'opd_end_time' })
  opdEndTime: string;

  @Column({ type: 'int', default: 15, name: 'slot_duration_minutes' })
  slotDurationMinutes: number;

  @Column({ type: 'boolean', default: true, name: 'enable_sms' })
  enableSms: boolean;

  @Column({ type: 'boolean', default: false, name: 'enable_whatsapp' })
  enableWhatsApp: boolean;

  @Column({ type: 'varchar', length: 10, default: 'INR', name: 'default_currency' })
  defaultCurrency: string;

  @Column({ type: 'boolean', default: false, name: 'nhcx_enabled' })
  nhcxEnabled: boolean;

  @Column({ type: 'boolean', default: true, name: 'pharmacy_otp_required' })
  pharmacyOtpRequired: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'consultation_fee_default' })
  consultationFeeDefault: number;

  @Column({ type: 'text', nullable: true, name: 'letterhead_html' })
  letterheadHtml: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
