import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('consultations')
export class Consultation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', unique: true, name: 'visit_id' })
  visitId: string;

  @Column({ type: 'varchar', name: 'doctor_id' })
  doctorId: string;

  @Column({ type: 'varchar', name: 'patient_id' })
  patientId: string;

  @Column({ type: 'text', nullable: true, name: 'chief_complaint' })
  chiefComplaint: string;

  @Column({ type: 'text', nullable: true, name: 'history_of_present_illness' })
  historyOfPresentIllness: string;

  @Column({ type: 'text', nullable: true, name: 'past_medical_history' })
  pastMedicalHistory: string;

  @Column({ type: 'text', nullable: true, name: 'family_history' })
  familyHistory: string;

  @Column({ type: 'text', nullable: true, name: 'physical_examination' })
  physicalExamination: string;

  @Column({ type: 'text', nullable: true })
  investigations: string;

  @Column({ type: 'text', nullable: true })
  diagnoses: string;

  @Column({ type: 'text', nullable: true, name: 'clinical_notes' })
  clinicalNotes: string;

  @Column({ type: 'text', nullable: true })
  advice: string;

  @Column({ type: 'date', nullable: true, name: 'follow_up_date' })
  followUpDate: Date;

  @Column({ type: 'text', nullable: true, name: 'follow_up_instructions' })
  followUpInstructions: string;

  @Column({ type: 'varchar', nullable: true, name: 'referred_to_specialty' })
  referredToSpecialty: string;

  @Column({ type: 'text', nullable: true, name: 'referral_notes' })
  referralNotes: string;

  @Column({ type: 'longtext', nullable: true, name: 'fhir_composition_json' })
  fhirCompositionJson: string;

  @Column({ type: 'boolean', default: false, name: 'is_complete' })
  isComplete: boolean;

  @Column({ type: 'datetime', nullable: true, name: 'completed_at' })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
