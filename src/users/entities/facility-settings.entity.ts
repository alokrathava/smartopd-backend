import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('facility_settings')
export class FacilitySettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, name: 'facility_id' })
  facilityId: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: '09:00',
    name: 'opd_start_time',
  })
  opdStartTime: string;

  @Column({
    type: 'varchar',
    length: 10,
    default: '18:00',
    name: 'opd_end_time',
  })
  opdEndTime: string;

  @Column({ type: 'int', default: 15, name: 'slot_duration_minutes' })
  slotDurationMinutes: number;

  @Column({ type: 'boolean', default: true, name: 'enable_sms' })
  enableSms: boolean;

  @Column({ type: 'boolean', default: false, name: 'enable_whatsapp' })
  enableWhatsApp: boolean;

  @Column({
    type: 'varchar',
    length: 10,
    default: 'INR',
    name: 'default_currency',
  })
  defaultCurrency: string;

  @Column({ type: 'boolean', default: false, name: 'nhcx_enabled' })
  nhcxEnabled: boolean;

  @Column({ type: 'boolean', default: true, name: 'pharmacy_otp_required' })
  pharmacyOtpRequired: boolean;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'consultation_fee_default',
  })
  consultationFeeDefault: number;

  @Column({ type: 'text', nullable: true, name: 'letterhead_html' })
  letterheadHtml: string;

  // ── White-Label / Branding ────────────────────────────────
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'brand_name' })
  brandName: string;

  @Column({ type: 'varchar', length: 7, nullable: true, name: 'primary_color' })
  primaryColor: string; // hex e.g. #2563EB

  @Column({
    type: 'varchar',
    length: 7,
    nullable: true,
    name: 'secondary_color',
  })
  secondaryColor: string;

  @Column({ type: 'varchar', length: 7, nullable: true, name: 'accent_color' })
  accentColor: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'font_family' })
  fontFamily: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'logo_url' })
  logoUrl: string; // per-settings override (for white-label kit)

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'favicon_url' })
  faviconUrl: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'support_phone',
  })
  supportPhone: string;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: true,
    name: 'support_email',
  })
  supportEmail: string;

  @Column({ type: 'text', nullable: true, name: 'welcome_message' })
  welcomeMessage: string; // Displayed on kiosk/login

  @Column({ type: 'text', nullable: true, name: 'footer_text' })
  footerText: string;

  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    name: 'custom_css_url',
  })
  customCssUrl: string;

  @Column({ type: 'boolean', default: false, name: 'show_powered_by' })
  showPoweredBy: boolean; // false = white-label hides "Powered by SmartOPD"

  // ── Kiosk config ─────────────────────────────────────────
  @Column({
    type: 'varchar',
    length: 10,
    default: 'en',
    name: 'default_language',
  })
  defaultLanguage: string;

  @Column({ type: 'boolean', default: false, name: 'enable_face_kiosk' })
  enableFaceKiosk: boolean;

  @Column({ type: 'boolean', default: true, name: 'enable_opd_queue' })
  enableOpdQueue: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
