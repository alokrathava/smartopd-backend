import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Gender } from '../../common/enums/gender.enum';

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  mrn: string;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  @Column({ type: 'date', name: 'date_of_birth' })
  dateOfBirth: Date;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column({ type: 'varchar', length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'alternate_phone' })
  alternatePhone: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pincode: string;

  @Column({ type: 'varchar', length: 5, nullable: true, name: 'blood_group' })
  bloodGroup: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'abha_number' })
  abhaNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'abha_address' })
  abhaAddress: string;

  @Column({ type: 'varchar', length: 4, nullable: true, name: 'aadhar_last_four' })
  aadharLastFour: string;

  @Column({ type: 'boolean', default: false, name: 'aadhaar_verified' })
  aadhaarVerified: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'emergency_contact_name' })
  emergencyContactName: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'emergency_contact_phone' })
  emergencyContactPhone: string;

  @Column({ type: 'text', nullable: true })
  allergies: string;

  @Column({ type: 'text', nullable: true, name: 'chronic_conditions' })
  chronicConditions: string;

  @Column({ type: 'text', nullable: true, name: 'insurance_info' })
  insuranceInfo: string;

  @Column({ type: 'longtext', nullable: true, name: 'fhir_patient_json' })
  fhirPatientJson: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'photo_url' })
  photoUrl: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'varchar', nullable: true, name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
