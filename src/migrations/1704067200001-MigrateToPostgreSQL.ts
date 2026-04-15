import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * PostgreSQL Migration: Full schema migration from MySQL to PostgreSQL
 *
 * This migration creates all 47 tables for SmartOPD with PostgreSQL-specific syntax.
 * Uses idempotent operations (CREATE IF NOT EXISTS where supported)
 * Handles PostgreSQL ENUM types and data type conversions
 *
 * Key conversions:
 * - ENUM types are created as PostgreSQL ENUM types
 * - TINYINT(1) → BOOLEAN
 * - AUTO_INCREMENT → SERIAL
 * - DATETIME(6) → TIMESTAMP WITH TIME ZONE
 * - Backticks → Double quotes
 */
export class MigrateToPostgreSQL1704067200001 implements MigrationInterface {
  name = 'MigrateToPostgreSQL1704067200001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types (idempotent)
    await this.createEnumTypes(queryRunner);

    // Enable uuid-ossp extension for UUID generation
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    // Create all tables
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "facilities" (
        "id" VARCHAR(36) PRIMARY KEY,
        "name" VARCHAR(200) NOT NULL,
        "registration_number" VARCHAR(100),
        "type" facility_type NOT NULL DEFAULT 'HOSPITAL',
        "address" TEXT,
        "city" VARCHAR(100),
        "state" VARCHAR(100),
        "pincode" VARCHAR(10),
        "phone" VARCHAR(20),
        "email" VARCHAR(150),
        "gst_number" VARCHAR(20),
        "abha_facility_id" VARCHAR(100),
        "abdm_hip_id" VARCHAR(200),
        "abdm_client_id" VARCHAR(200),
        "nabh_accreditation" VARCHAR(100),
        "website_url" VARCHAR(200),
        "fax_number" VARCHAR(20),
        "favicon_url" VARCHAR(500),
        "logo_url" VARCHAR(500),
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "approval_status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        "subscription_plan" subscription_plan NOT NULL DEFAULT 'STARTER',
        "subscription_expires_at" TIMESTAMP,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "email" VARCHAR(150) NOT NULL UNIQUE,
        "phone" VARCHAR(20),
        "password_hash" VARCHAR(255) NOT NULL,
        "first_name" VARCHAR(100) NOT NULL,
        "last_name" VARCHAR(100) NOT NULL,
        "role" user_role NOT NULL DEFAULT 'RECEPTIONIST',
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMP,
        "invite_token" VARCHAR(255),
        "invite_expires_at" TIMESTAMP,
        "profile_photo" VARCHAR(500),
        "doctor_profile" TEXT,
        "nurse_profile" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS "IDX_users_facility_id" ON "users" ("facility_id");
      CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email");
    `);

    // Create facility_settings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "facility_settings" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL UNIQUE,
        "opd_start_time" VARCHAR(10) NOT NULL DEFAULT '09:00',
        "opd_end_time" VARCHAR(10) NOT NULL DEFAULT '18:00',
        "slot_duration_minutes" INT NOT NULL DEFAULT 15,
        "enable_sms" BOOLEAN NOT NULL DEFAULT true,
        "enable_whatsapp" BOOLEAN NOT NULL DEFAULT false,
        "default_currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
        "nhcx_enabled" BOOLEAN NOT NULL DEFAULT false,
        "pharmacy_otp_required" BOOLEAN NOT NULL DEFAULT true,
        "consultation_fee_default" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "letterhead_html" TEXT,
        "brand_name" VARCHAR(100),
        "primary_color" VARCHAR(7),
        "secondary_color" VARCHAR(7),
        "accent_color" VARCHAR(7),
        "font_family" VARCHAR(100),
        "logo_url" VARCHAR(500),
        "favicon_url" VARCHAR(500),
        "support_phone" VARCHAR(100),
        "support_email" VARCHAR(150),
        "welcome_message" TEXT,
        "footer_text" TEXT,
        "custom_css_url" VARCHAR(200),
        "show_powered_by" BOOLEAN NOT NULL DEFAULT false,
        "default_language" VARCHAR(10) NOT NULL DEFAULT 'en',
        "enable_face_kiosk" BOOLEAN NOT NULL DEFAULT false,
        "enable_opd_queue" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create patients table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patients" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "mrn" VARCHAR(30),
        "first_name" VARCHAR(100) NOT NULL,
        "last_name" VARCHAR(100) NOT NULL,
        "date_of_birth" DATE NOT NULL,
        "gender" patient_gender NOT NULL,
        "phone" VARCHAR(20) NOT NULL,
        "alternate_phone" VARCHAR(20),
        "email" VARCHAR(150),
        "address" TEXT,
        "city" VARCHAR(100),
        "state" VARCHAR(100),
        "pincode" VARCHAR(10),
        "blood_group" VARCHAR(5),
        "abha_number" VARCHAR(20),
        "abha_address" VARCHAR(100),
        "aadhar_last_four" VARCHAR(4),
        "aadhaar_verified" BOOLEAN NOT NULL DEFAULT false,
        "emergency_contact_name" VARCHAR(100),
        "emergency_contact_phone" VARCHAR(20),
        "allergies" TEXT,
        "chronic_conditions" TEXT,
        "insurance_info" TEXT,
        "fhir_patient_json" TEXT,
        "abha_linked_at" TIMESTAMP,
        "photo_url" VARCHAR(500),
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_by" VARCHAR(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS "IDX_patients_facility_id" ON "patients" ("facility_id");
      CREATE INDEX IF NOT EXISTS "IDX_patients_phone" ON "patients" ("phone");
    `);

    // Create patient_consents table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patient_consents" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "patient_id" VARCHAR(255) NOT NULL,
        "consent_type" consent_type NOT NULL,
        "consent_given_at" TIMESTAMP NOT NULL,
        "consent_given_by" VARCHAR(255),
        "is_guardian" BOOLEAN NOT NULL DEFAULT false,
        "guardian_relation" VARCHAR(50),
        "ip_address" VARCHAR(50),
        "revoked_at" TIMESTAMP,
        "document_url" VARCHAR(500),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create visits table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "visits" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "visit_number" VARCHAR(255) NOT NULL,
        "patient_id" VARCHAR(255) NOT NULL,
        "doctor_id" VARCHAR(255),
        "registered_by_id" VARCHAR(255) NOT NULL,
        "visit_type" visit_type NOT NULL,
        "status" visit_status NOT NULL DEFAULT 'REGISTERED',
        "scheduled_at" TIMESTAMP,
        "checked_in_at" TIMESTAMP,
        "nurse_seen_at" TIMESTAMP,
        "doctor_seen_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "token_number" INT NOT NULL DEFAULT 0,
        "chief_complaint" TEXT,
        "visit_notes" TEXT,
        "follow_up_date" DATE,
        "follow_up_instructions" TEXT,
        "is_tele_consult" BOOLEAN NOT NULL DEFAULT false,
        "tele_consult_link" VARCHAR(255),
        "fhir_encounter_json" TEXT,
        "total_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "paid_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "payment_status" payment_status NOT NULL DEFAULT 'PENDING',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS "IDX_visits_facility_id" ON "visits" ("facility_id");
      CREATE INDEX IF NOT EXISTS "IDX_visits_patient_id" ON "visits" ("patient_id");
    `);

    // Create patient_admissions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patient_admissions" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "admissionNumber" VARCHAR(20) UNIQUE,
        "patientId" VARCHAR(255) NOT NULL,
        "sourceVisitId" VARCHAR(255),
        "admittingDoctorId" VARCHAR(255) NOT NULL,
        "primaryNurseId" VARCHAR(255),
        "bedId" VARCHAR(255) NOT NULL,
        "wardId" VARCHAR(255) NOT NULL,
        "status" VARCHAR(30) NOT NULL DEFAULT 'pending',
        "admissionType" VARCHAR(20) NOT NULL,
        "chiefComplaint" VARCHAR(255) NOT NULL,
        "icd10Codes" TEXT,
        "nhcxPreAuthId" VARCHAR(255),
        "nhcxPreAuthStatus" VARCHAR(255),
        "nhcxApprovedAmount" NUMERIC(12,2),
        "attendantName" VARCHAR(255),
        "attendantPhone" VARCHAR(255),
        "wristbandNumber" VARCHAR(255) UNIQUE,
        "expectedDischargeDate" DATE,
        "admittedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "dischargeInitiatedAt" TIMESTAMP,
        "dischargedAt" TIMESTAMP,
        "dischargeType" VARCHAR(20),
        "dischargeNotes" TEXT,
        "fhirDischargePublishedAt" TIMESTAMP,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS "IDX_admissions_facility_id" ON "patient_admissions" ("facility_id");
    `);

    // Create discharge_summaries table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "discharge_summaries" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "admissionId" VARCHAR(255) NOT NULL,
        "patientId" VARCHAR(255) NOT NULL,
        "dischargedById" VARCHAR(255) NOT NULL,
        "finalDiagnosis" TEXT,
        "hospitalCourse" TEXT,
        "proceduresPerformed" TEXT,
        "medicationsOnDischarge" TEXT,
        "dischargeInstructions" TEXT,
        "followUpDate" VARCHAR(255),
        "followUpDoctor" VARCHAR(255),
        "followUpNotes" VARCHAR(255),
        "fhirSummaryJson" TEXT,
        "lengthOfStayDays" SMALLINT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
    `);

    // Continue with remaining 41 tables (shown in next part)
    // Creating in batches to avoid SQL complexity

    // Create ward_rounds table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ward_rounds" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "admissionId" VARCHAR(255) NOT NULL,
        "conductedById" VARCHAR(255) NOT NULL,
        "conductedAt" TIMESTAMP NOT NULL,
        "wardId" VARCHAR(255),
        "notes" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create ward_round_stops table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ward_round_stops" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "wardRoundId" VARCHAR(255) NOT NULL,
        "admissionId" VARCHAR(255) NOT NULL,
        "bedId" VARCHAR(255) NOT NULL,
        "patientId" VARCHAR(255) NOT NULL,
        "stopOrder" INT NOT NULL DEFAULT 0,
        "subjectiveNotes" TEXT,
        "objectiveNotes" TEXT,
        "assessmentNotes" TEXT,
        "planNotes" TEXT,
        "vitalSummary" TEXT,
        "flagged" BOOLEAN NOT NULL DEFAULT false,
        "flagReason" TEXT,
        "conductedAt" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create consultations table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "consultations" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "visit_id" VARCHAR(255) NOT NULL UNIQUE,
        "doctor_id" VARCHAR(255) NOT NULL,
        "patient_id" VARCHAR(255),
        "chief_complaint" TEXT,
        "history_of_present_illness" TEXT,
        "past_medical_history" TEXT,
        "family_history" TEXT,
        "physical_examination" TEXT,
        "investigations" TEXT,
        "diagnoses" TEXT,
        "clinical_notes" TEXT,
        "advice" TEXT,
        "follow_up_date" DATE,
        "follow_up_instructions" TEXT,
        "referred_to_specialty" VARCHAR(255),
        "referral_notes" TEXT,
        "fhir_composition_json" TEXT,
        "is_complete" BOOLEAN NOT NULL DEFAULT false,
        "completed_at" TIMESTAMP,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create prescriptions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prescriptions" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "visit_id" VARCHAR(255) NOT NULL,
        "consultation_id" VARCHAR(255),
        "patient_id" VARCHAR(255),
        "prescribed_by_id" VARCHAR(255) NOT NULL,
        "prescription_date" DATE NOT NULL,
        "status" prescription_status NOT NULL DEFAULT 'DRAFT',
        "notes" TEXT,
        "fhir_medication_request_json" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create prescription_items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prescription_items" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "prescription_id" VARCHAR(255) NOT NULL,
        "drug_name" VARCHAR(255) NOT NULL,
        "generic_name" VARCHAR(255),
        "form" drug_form NOT NULL,
        "strength" VARCHAR(255),
        "dose" VARCHAR(255) NOT NULL,
        "frequency" frequency NOT NULL,
        "route" VARCHAR(255) NOT NULL DEFAULT 'ORAL',
        "duration_days" INT,
        "quantity" INT,
        "instructions" TEXT,
        "is_generic_substitutable" BOOLEAN NOT NULL DEFAULT true,
        "status" prescription_item_status NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create icd10 table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "icd10" (
        "id" VARCHAR(36) PRIMARY KEY,
        "code" VARCHAR(255) NOT NULL UNIQUE,
        "description" VARCHAR(255) NOT NULL,
        "category_code" VARCHAR(255),
        "category_description" VARCHAR(255),
        "is_common" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create vitals table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vitals" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "visit_id" VARCHAR(255) NOT NULL,
        "patient_id" VARCHAR(255),
        "recorded_by_id" VARCHAR(255) NOT NULL,
        "temperature_celsius" NUMERIC(5,2),
        "temperature_site" VARCHAR(255),
        "pulse_bpm" INT,
        "respiratory_rate" INT,
        "systolic_bp" INT,
        "diastolic_bp" INT,
        "sp_o2" NUMERIC(5,2),
        "height_cm" NUMERIC(6,2),
        "weight_kg" NUMERIC(6,2),
        "bmi" NUMERIC(5,2),
        "pain_score" INT,
        "blood_glucose" NUMERIC(6,2),
        "notes" TEXT,
        "is_critical" BOOLEAN NOT NULL DEFAULT false,
        "critical_flags" TEXT,
        "recorded_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create triages table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "triages" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "visit_id" VARCHAR(255) NOT NULL UNIQUE,
        "triage_by_id" VARCHAR(255) NOT NULL,
        "triage_category" triage_category NOT NULL,
        "chief_complaint" TEXT NOT NULL,
        "triage_notes" TEXT,
        "triage_at" TIMESTAMP NOT NULL,
        "overridden_by" VARCHAR(255),
        "override_reason" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create mar table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mar" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "visit_id" VARCHAR(255) NOT NULL,
        "patient_id" VARCHAR(255) NOT NULL,
        "prescription_item_id" VARCHAR(255),
        "administered_by_id" VARCHAR(255) NOT NULL,
        "drug_name" VARCHAR(255) NOT NULL,
        "dose" VARCHAR(255) NOT NULL,
        "route" VARCHAR(255) NOT NULL,
        "scheduled_at" TIMESTAMP NOT NULL,
        "administered_at" TIMESTAMP,
        "status" mar_status NOT NULL DEFAULT 'SCHEDULED',
        "hold_reason" TEXT,
        "notes" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create lab_orders table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lab_orders" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "patient_id" VARCHAR(255) NOT NULL,
        "visit_id" VARCHAR(255) NOT NULL,
        "ordered_by_id" VARCHAR(255) NOT NULL,
        "status" lab_order_status NOT NULL DEFAULT 'ORDERED',
        "partner" lab_partner NOT NULL DEFAULT 'IN_HOUSE',
        "test_name" VARCHAR(200) NOT NULL,
        "loinc_code" VARCHAR(50),
        "notes" TEXT,
        "external_order_id" VARCHAR(100),
        "fhir_service_request" TEXT,
        "urgency" VARCHAR(20) NOT NULL DEFAULT 'ROUTINE',
        "sent_to_lab_at" TIMESTAMP,
        "resulted_at" TIMESTAMP,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_lab_orders_facility_id" ON "lab_orders" ("facility_id");
      CREATE INDEX IF NOT EXISTS "IDX_lab_orders_patient_id" ON "lab_orders" ("patient_id");
    `);

    // Create lab_results table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lab_results" (
        "id" VARCHAR(36) PRIMARY KEY,
        "lab_order_id" VARCHAR(255) NOT NULL,
        "patient_id" VARCHAR(255) NOT NULL,
        "facility_id" VARCHAR(255) NOT NULL,
        "component_name" VARCHAR(200) NOT NULL,
        "loinc_code" VARCHAR(100),
        "value" VARCHAR(100) NOT NULL,
        "unit" VARCHAR(50),
        "reference_range" VARCHAR(200),
        "status" lab_result_status NOT NULL DEFAULT 'PENDING',
        "fhir_observation" TEXT,
        "interpretation" VARCHAR(200),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_lab_results_lab_order_id" ON "lab_results" ("lab_order_id");
      CREATE INDEX IF NOT EXISTS "IDX_lab_results_patient_id" ON "lab_results" ("patient_id");
    `);

    // Create rooms table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "rooms" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "name" VARCHAR(255) NOT NULL,
        "type" VARCHAR(30) NOT NULL,
        "building" VARCHAR(255),
        "floor" VARCHAR(255),
        "ward" VARCHAR(255),
        "capacity" INT NOT NULL DEFAULT 1,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "notes" VARCHAR(255),
        "features" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create beds table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "beds" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "roomId" VARCHAR(255) NOT NULL,
        "bedNumber" VARCHAR(255) NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
        "currentPatientId" VARCHAR(255),
        "currentAdmissionId" VARCHAR(255),
        "hasVentilator" BOOLEAN NOT NULL DEFAULT false,
        "hasMonitor" BOOLEAN NOT NULL DEFAULT false,
        "hasCallBell" BOOLEAN NOT NULL DEFAULT false,
        "hasIvRack" BOOLEAN NOT NULL DEFAULT false,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "notes" VARCHAR(255),
        "roomType" VARCHAR(30),
        "lastOccupiedBy" VARCHAR(255),
        "lastCleanedAt" TIMESTAMP,
        "lastCleanedBy" VARCHAR(255),
        "cleaningStartedAt" TIMESTAMP,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create housekeeping_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "housekeeping_logs" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "bedId" VARCHAR(255) NOT NULL,
        "startedAt" TIMESTAMP NOT NULL,
        "completedAt" TIMESTAMP,
        "completedById" VARCHAR(255),
        "status" VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
        "slaMinutes" INT NOT NULL DEFAULT 30,
        "notes" VARCHAR(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create equipment table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "equipment" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "brand" VARCHAR(255),
        "model" VARCHAR(255),
        "serial_number" VARCHAR(255),
        "asset_tag" VARCHAR(255),
        "qr_code" VARCHAR(255) UNIQUE,
        "category" equipment_category NOT NULL,
        "ownership_type" ownership_type NOT NULL DEFAULT 'OWNED',
        "purchase_date" DATE,
        "purchase_price" NUMERIC(12,2),
        "location" VARCHAR(255),
        "status" equipment_status NOT NULL DEFAULT 'AVAILABLE',
        "warranty_expires_at" DATE,
        "next_maintenance_due" DATE,
        "maintenance_frequency_days" INT,
        "notes" TEXT,
        "photo_url" VARCHAR(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_equipment_next_maintenance_due" ON "equipment" ("next_maintenance_due");
    `);

    // Create equipment_leases table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "equipment_leases" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "equipment_id" VARCHAR(255) NOT NULL,
        "patient_id" VARCHAR(255) NOT NULL,
        "visit_id" VARCHAR(255),
        "issued_by_id" VARCHAR(255) NOT NULL,
        "issued_at" TIMESTAMP NOT NULL,
        "due_date" DATE NOT NULL,
        "returned_at" TIMESTAMP,
        "returned_condition" equipment_returned_condition,
        "deposit_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "deposit_mode" VARCHAR(255),
        "deposit_settled" BOOLEAN NOT NULL DEFAULT false,
        "notes" TEXT,
        "status" equipment_lease_status NOT NULL DEFAULT 'ACTIVE',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_equipment_leases_due_date" ON "equipment_leases" ("due_date");
    `);

    // Create maintenance_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "maintenance_logs" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "equipment_id" VARCHAR(255) NOT NULL,
        "performed_by_id" VARCHAR(255),
        "maintenance_type" maintenance_type NOT NULL,
        "scheduled_date" DATE NOT NULL,
        "performed_date" DATE,
        "vendor_name" VARCHAR(255),
        "cost" NUMERIC(10,2),
        "description" TEXT,
        "next_due_date" DATE,
        "status" maintenance_status NOT NULL DEFAULT 'SCHEDULED',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create consumable_items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "consumable_items" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "itemCode" VARCHAR(255) NOT NULL,
        "itemName" VARCHAR(255) NOT NULL,
        "category" VARCHAR(255) NOT NULL,
        "unit" VARCHAR(255) NOT NULL,
        "unitCost" NUMERIC(10,2) NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create consumable_consumptions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "consumable_consumptions" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "wardId" VARCHAR(255) NOT NULL,
        "admissionId" VARCHAR(255),
        "consumableItemId" VARCHAR(255) NOT NULL,
        "quantity" INT NOT NULL,
        "usedBy" VARCHAR(255) NOT NULL,
        "usedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "purpose" VARCHAR(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS "IDX_consumable_consumptions_wardId" ON "consumable_consumptions" ("wardId");
    `);

    // Create ward_inventory table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ward_inventory" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "wardId" VARCHAR(255) NOT NULL,
        "consumableItemId" VARCHAR(255) NOT NULL,
        "currentStock" INT NOT NULL DEFAULT 0,
        "reorderLevel" INT NOT NULL DEFAULT 10,
        "lastRestockedAt" TIMESTAMP,
        "lastRestockedQuantity" INT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        UNIQUE ("facility_id","wardId","consumableItemId")
      );
      CREATE INDEX IF NOT EXISTS "IDX_ward_inventory_wardId" ON "ward_inventory" ("wardId");
    `);

    // Create ot_bookings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ot_bookings" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "patientId" VARCHAR(255) NOT NULL,
        "admissionId" VARCHAR(255),
        "surgeonId" VARCHAR(255) NOT NULL,
        "anaesthetistId" VARCHAR(255),
        "otRoomId" VARCHAR(255) NOT NULL,
        "scheduledStart" TIMESTAMP NOT NULL,
        "scheduledEnd" TIMESTAMP NOT NULL,
        "actualStart" TIMESTAMP,
        "actualEnd" TIMESTAMP,
        "procedureName" VARCHAR(255) NOT NULL,
        "cptCodes" TEXT,
        "urgency" VARCHAR(20) NOT NULL DEFAULT 'elective',
        "status" VARCHAR(20) NOT NULL DEFAULT 'booked',
        "postOpBedId" VARCHAR(255),
        "preOpChecklist" TEXT,
        "preOpChecklistCompletedAt" TIMESTAMP,
        "intraOpNotes" TEXT,
        "postOpNotes" TEXT,
        "cancelledReason" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS "IDX_ot_bookings_patientId" ON "ot_bookings" ("patientId");
    `);

    // Create bills table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bills" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "visit_id" VARCHAR(255) UNIQUE,
        "patient_id" VARCHAR(255) NOT NULL,
        "bill_number" VARCHAR(255) NOT NULL UNIQUE,
        "bill_date" DATE NOT NULL,
        "consultation_fee" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "medicine_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "procedure_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "diagnostic_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "misc_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "subtotal" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "discount_percent" NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        "discount_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "tax_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "total_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "paid_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "due_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "status" bill_status NOT NULL DEFAULT 'DRAFT',
        "insurance_covered" BOOLEAN NOT NULL DEFAULT false,
        "insurance_amount" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        "notes" TEXT,
        "generated_by_id" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create bill_items table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "bill_items" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "bill_id" VARCHAR(255) NOT NULL,
        "description" VARCHAR(255) NOT NULL,
        "item_type" bill_item_type NOT NULL,
        "quantity" INT NOT NULL DEFAULT 1,
        "unit_price" NUMERIC(10,2) NOT NULL,
        "amount" NUMERIC(10,2) NOT NULL,
        "gst_percent" NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        "hsn_sac_code" VARCHAR(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create payment_transactions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_transactions" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "bill_id" VARCHAR(255) NOT NULL,
        "patient_id" VARCHAR(255) NOT NULL,
        "amount" NUMERIC(10,2) NOT NULL,
        "payment_mode" payment_mode NOT NULL,
        "upi_transaction_id" VARCHAR(255),
        "upi_ref_number" VARCHAR(255),
        "card_last4" VARCHAR(255),
        "payment_gateway" VARCHAR(255),
        "gateway_transaction_id" VARCHAR(255),
        "gateway_response" TEXT,
        "status" transaction_status NOT NULL DEFAULT 'INITIATED',
        "paid_at" TIMESTAMP,
        "notes" TEXT,
        "received_by_id" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create nhcx_claims table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nhcx_claims" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "visit_id" VARCHAR(255) NOT NULL,
        "bill_id" VARCHAR(255) NOT NULL,
        "patient_id" VARCHAR(255) NOT NULL,
        "insurer_name" VARCHAR(255) NOT NULL,
        "policy_number" VARCHAR(255),
        "claim_amount" NUMERIC(10,2) NOT NULL,
        "approved_amount" NUMERIC(10,2),
        "nhcx_claim_id" VARCHAR(255),
        "nhcx_status" nhcx_claim_status NOT NULL DEFAULT 'PENDING',
        "submitted_at" TIMESTAMP NOT NULL,
        "settled_at" TIMESTAMP,
        "rejection_reason" TEXT,
        "nhcx_response_json" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create insurance_pre_auths table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "insurance_pre_auths" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "patientId" VARCHAR(255) NOT NULL,
        "admissionId" VARCHAR(255),
        "visitId" VARCHAR(255),
        "insurerName" VARCHAR(255) NOT NULL,
        "policyNumber" VARCHAR(255),
        "tpaName" VARCHAR(255),
        "diagnosisCodes" TEXT,
        "requestedProcedures" TEXT,
        "estimatedCost" NUMERIC(10,2) NOT NULL,
        "approvedAmount" NUMERIC(10,2),
        "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
        "referenceNumber" VARCHAR(255),
        "submittedAt" TIMESTAMP,
        "respondedAt" TIMESTAMP,
        "rejectionReason" TEXT,
        "insurerResponseJson" TEXT,
        "requestedById" VARCHAR(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create nhcx_claim_records table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nhcx_claim_records" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "patient_id" VARCHAR(255) NOT NULL,
        "visit_id" VARCHAR(255),
        "admission_id" VARCHAR(255),
        "bill_id" VARCHAR(255),
        "claim_type" nhcx_claim_record_type NOT NULL,
        "status" nhcx_claim_record_status NOT NULL DEFAULT 'DRAFT',
        "nhcx_claim_id" VARCHAR(100),
        "payer_name" VARCHAR(200),
        "policy_number" VARCHAR(100),
        "member_id" VARCHAR(100),
        "claimed_amount" NUMERIC(12,2),
        "approved_amount" NUMERIC(12,2),
        "fhir_bundle" TEXT,
        "nhcx_response" TEXT,
        "denial_reason" TEXT,
        "query_text" TEXT,
        "submitted_at" TIMESTAMP,
        "resolved_at" TIMESTAMP,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_nhcx_claim_records_facility_id" ON "nhcx_claim_records" ("facility_id");
      CREATE INDEX IF NOT EXISTS "IDX_nhcx_claim_records_patient_id" ON "nhcx_claim_records" ("patient_id");
    `);

    // Create abdm_records table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "abdm_records" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "patient_id" VARCHAR(255) NOT NULL,
        "flow_type" abdm_flow_type NOT NULL,
        "status" abdm_status NOT NULL DEFAULT 'INITIATED',
        "abha_number" VARCHAR(30),
        "abha_address" VARCHAR(100),
        "txn_id" VARCHAR(100),
        "consent_artefact_id" VARCHAR(100),
        "access_token_encrypted" TEXT,
        "raw_response" TEXT,
        "error_code" VARCHAR(50),
        "error_message" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_abdm_records_facility_id" ON "abdm_records" ("facility_id");
      CREATE INDEX IF NOT EXISTS "IDX_abdm_records_patient_id" ON "abdm_records" ("patient_id");
    `);

    // Create follow_ups table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "follow_ups" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "patient_id" VARCHAR(255) NOT NULL,
        "visit_id" VARCHAR(255),
        "assigned_to_id" VARCHAR(255),
        "follow_up_date" DATE NOT NULL,
        "reason" TEXT,
        "notes" TEXT,
        "status" follow_up_status NOT NULL DEFAULT 'PENDING',
        "completed_at" TIMESTAMP,
        "completed_by" VARCHAR(255),
        "notification_sent" BOOLEAN NOT NULL DEFAULT false,
        "notification_sent_at" TIMESTAMP,
        "priority" priority_level NOT NULL DEFAULT 'MEDIUM',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_follow_ups_follow_up_date" ON "follow_ups" ("follow_up_date");
    `);

    // Create patient_segments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patient_segments" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "criteria" TEXT NOT NULL,
        "patient_count" INT NOT NULL DEFAULT 0,
        "last_refreshed_at" TIMESTAMP,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create crm_campaigns table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "crm_campaigns" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "segment_id" VARCHAR(255),
        "channel" VARCHAR(255) NOT NULL,
        "template_code" VARCHAR(255),
        "scheduled_at" TIMESTAMP,
        "sent_at" TIMESTAMP,
        "status" crm_campaign_status NOT NULL DEFAULT 'DRAFT',
        "total_recipients" INT NOT NULL DEFAULT 0,
        "sent_count" INT NOT NULL DEFAULT 0,
        "failed_count" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create notification_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_logs" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "channel" notification_channel NOT NULL,
        "recipient" VARCHAR(255) NOT NULL,
        "template_code" VARCHAR(255),
        "subject" VARCHAR(255),
        "body" TEXT NOT NULL,
        "status" notification_status NOT NULL DEFAULT 'QUEUED',
        "external_id" VARCHAR(255),
        "error_message" TEXT,
        "sent_at" TIMESTAMP,
        "related_entity_type" VARCHAR(255),
        "related_entity_id" VARCHAR(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create notification_templates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_templates" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "code" VARCHAR(255) NOT NULL,
        "channel" notification_channel NOT NULL,
        "language" VARCHAR(255) NOT NULL DEFAULT 'en',
        "subject" VARCHAR(255),
        "body_template" TEXT NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create staff_shifts table (renamed from staff_rosters context)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_shifts" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "staffId" VARCHAR(255) NOT NULL,
        "staffRole" VARCHAR(255) NOT NULL,
        "wardId" VARCHAR(255),
        "shiftType" VARCHAR(20) NOT NULL,
        "shiftDate" DATE NOT NULL,
        "startAt" TIMESTAMP NOT NULL,
        "endAt" TIMESTAMP NOT NULL,
        "actualStartAt" TIMESTAMP,
        "actualEndAt" TIMESTAMP,
        "status" VARCHAR(20) NOT NULL DEFAULT 'scheduled',
        "swappedWithStaffId" VARCHAR(255),
        "approvedBy" VARCHAR(255),
        "notes" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE
      );
      CREATE INDEX IF NOT EXISTS "IDX_staff_shifts_wardId" ON "staff_shifts" ("wardId");
    `);

    // Create pharmacy_inventory table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pharmacy_inventory" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "drug_name" VARCHAR(255) NOT NULL,
        "generic_name" VARCHAR(255),
        "form" VARCHAR(255) NOT NULL,
        "strength" VARCHAR(255),
        "manufacturer" VARCHAR(255),
        "batch_number" VARCHAR(255) NOT NULL,
        "expiry_date" DATE NOT NULL,
        "quantity_in_stock" INT NOT NULL DEFAULT 0,
        "reorder_level" INT NOT NULL DEFAULT 10,
        "unit_price" NUMERIC(10,2) NOT NULL,
        "mrp" NUMERIC(10,2) NOT NULL,
        "hsn_code" VARCHAR(255),
        "gst_percent" NUMERIC(5,2) NOT NULL DEFAULT 18.00,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "storage_location" VARCHAR(255),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_pharmacy_inventory_expiry_date" ON "pharmacy_inventory" ("expiry_date");
    `);

    // Create dispense_records table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "dispense_records" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255) NOT NULL,
        "prescription_id" VARCHAR(255) NOT NULL,
        "prescription_item_id" VARCHAR(255),
        "patient_id" VARCHAR(255) NOT NULL,
        "dispensed_by_id" VARCHAR(255) NOT NULL,
        "drug_name" VARCHAR(255) NOT NULL,
        "generic_name" VARCHAR(255),
        "batch_number" VARCHAR(255),
        "expiry_date" DATE,
        "quantity_dispensed" INT NOT NULL,
        "unit_price" NUMERIC(10,2),
        "total_price" NUMERIC(10,2),
        "dispensed_at" TIMESTAMP NOT NULL,
        "otp_verified" BOOLEAN NOT NULL DEFAULT false,
        "otp_verified_at" TIMESTAMP,
        "notes" TEXT,
        "returned_qty" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create audit_logs table (with SERIAL for auto-increment)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" SERIAL PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "user_id" VARCHAR(255) NOT NULL,
        "user_role" VARCHAR(255),
        "action" VARCHAR(255) NOT NULL,
        "resource" VARCHAR(255) NOT NULL,
        "resource_id" VARCHAR(255),
        "payload" TEXT,
        "ip_address" VARCHAR(255),
        "user_agent" VARCHAR(255),
        "status_code" INT,
        "duration" INT,
        "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_facility_id" ON "audit_logs" ("facility_id");
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_user_id" ON "audit_logs" ("user_id");
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_timestamp" ON "audit_logs" ("timestamp");
    `);

    // Create otps table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "otps" (
        "id" VARCHAR(36) PRIMARY KEY,
        "facility_id" VARCHAR(255),
        "phone" VARCHAR(20) NOT NULL,
        "code" VARCHAR(255) NOT NULL,
        "purpose" otp_purpose NOT NULL DEFAULT 'LOGIN',
        "expires_at" TIMESTAMP NOT NULL,
        "used" BOOLEAN NOT NULL DEFAULT false,
        "attempts" INT NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create refresh_tokens table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" VARCHAR(36) PRIMARY KEY,
        "user_id" VARCHAR(255) NOT NULL,
        "facility_id" VARCHAR(255),
        "selector" VARCHAR(36) NOT NULL UNIQUE,
        "token" VARCHAR(255) NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "revoked" BOOLEAN NOT NULL DEFAULT false,
        "ip_address" VARCHAR(50),
        "user_agent" VARCHAR(500),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id");
    `);
  }

  private async createEnumTypes(queryRunner: QueryRunner): Promise<void> {
    // Create all ENUM types
    const enumTypes = [
      'CREATE TYPE facility_type AS ENUM (\'HOSPITAL\',\'CLINIC\',\'DIAGNOSTIC\')',
      'CREATE TYPE subscription_plan AS ENUM (\'STARTER\',\'GROWTH\',\'SCALE\',\'ENTERPRISE\')',
      'CREATE TYPE user_role AS ENUM (\'SUPER_ADMIN\',\'FACILITY_ADMIN\',\'DOCTOR\',\'NURSE\',\'RECEPTIONIST\',\'PHARMACIST\',\'EQUIPMENT_STAFF\',\'CRM_ANALYST\')',
      'CREATE TYPE patient_gender AS ENUM (\'MALE\',\'FEMALE\',\'OTHER\',\'PREFER_NOT_TO_SAY\')',
      'CREATE TYPE consent_type AS ENUM (\'TREATMENT\',\'DATA_SHARING\',\'ABHA_LINK\',\'RESEARCH\')',
      'CREATE TYPE visit_type AS ENUM (\'OPD\',\'EMERGENCY\',\'FOLLOW_UP\',\'TELE\')',
      'CREATE TYPE visit_status AS ENUM (\'REGISTERED\',\'WAITING\',\'WITH_NURSE\',\'WITH_DOCTOR\',\'COMPLETED\',\'CANCELLED\',\'NO_SHOW\')',
      'CREATE TYPE payment_status AS ENUM (\'PENDING\',\'PARTIAL\',\'PAID\',\'WAIVED\')',
      'CREATE TYPE prescription_status AS ENUM (\'DRAFT\',\'FINALIZED\',\'PARTIALLY_DISPENSED\',\'FULLY_DISPENSED\')',
      'CREATE TYPE drug_form AS ENUM (\'TABLET\',\'CAPSULE\',\'SYRUP\',\'INJECTION\',\'CREAM\',\'DROPS\',\'INHALER\',\'PATCH\',\'OTHER\')',
      'CREATE TYPE frequency AS ENUM (\'OD\',\'BD\',\'TDS\',\'QID\',\'SOS\',\'STAT\',\'WEEKLY\')',
      'CREATE TYPE prescription_item_status AS ENUM (\'ACTIVE\',\'DISPENSED\',\'CANCELLED\')',
      'CREATE TYPE triage_category AS ENUM (\'RED\',\'ORANGE\',\'YELLOW\',\'GREEN\',\'BLUE\')',
      'CREATE TYPE mar_status AS ENUM (\'SCHEDULED\',\'ADMINISTERED\',\'HELD\',\'MISSED\')',
      'CREATE TYPE lab_order_status AS ENUM (\'ORDERED\',\'SENT_TO_LAB\',\'SAMPLE_COLLECTED\',\'PROCESSING\',\'RESULTED\',\'CANCELLED\')',
      'CREATE TYPE lab_partner AS ENUM (\'IN_HOUSE\',\'SRL\',\'THYROCARE\',\'DR_LAL\',\'METROPOLIS\')',
      'CREATE TYPE lab_result_status AS ENUM (\'NORMAL\',\'ABNORMAL_HIGH\',\'ABNORMAL_LOW\',\'CRITICAL_HIGH\',\'CRITICAL_LOW\',\'PENDING\')',
      'CREATE TYPE equipment_category AS ENUM (\'DIAGNOSTIC\',\'SURGICAL\',\'MONITORING\',\'IT\',\'FURNITURE\',\'OTHER\',\'WHEELCHAIR\',\'OXYGEN_CYLINDER\')',
      'CREATE TYPE ownership_type AS ENUM (\'OWNED\',\'LEASED\',\'RENTAL\')',
      'CREATE TYPE equipment_status AS ENUM (\'AVAILABLE\',\'LEASED_OUT\',\'UNDER_MAINTENANCE\',\'DECOMMISSIONED\')',
      'CREATE TYPE equipment_returned_condition AS ENUM (\'GOOD\',\'DAMAGED\',\'MISSING\')',
      'CREATE TYPE equipment_lease_status AS ENUM (\'ACTIVE\',\'RETURNED\',\'OVERDUE\')',
      'CREATE TYPE maintenance_type AS ENUM (\'PREVENTIVE\',\'CORRECTIVE\',\'CALIBRATION\',\'INSPECTION\')',
      'CREATE TYPE maintenance_status AS ENUM (\'SCHEDULED\',\'IN_PROGRESS\',\'COMPLETED\',\'CANCELLED\')',
      'CREATE TYPE bill_status AS ENUM (\'DRAFT\',\'FINALIZED\',\'PARTIAL\',\'PAID\',\'CANCELLED\',\'REFUNDED\')',
      'CREATE TYPE bill_item_type AS ENUM (\'CONSULTATION\',\'MEDICINE\',\'PROCEDURE\',\'DIAGNOSTIC\',\'MISC\',\'PHARMACY\',\'LAB\',\'OTHER\')',
      'CREATE TYPE payment_mode AS ENUM (\'CASH\',\'UPI\',\'CARD\',\'NEFT\',\'INSURANCE\',\'WAIVED\')',
      'CREATE TYPE transaction_status AS ENUM (\'INITIATED\',\'SUCCESS\',\'FAILED\',\'REFUNDED\')',
      'CREATE TYPE nhcx_claim_status AS ENUM (\'SUBMITTED\',\'PENDING\',\'APPROVED\',\'REJECTED\',\'SETTLED\')',
      'CREATE TYPE nhcx_claim_record_type AS ENUM (\'OPD\',\'IPD\',\'SURGERY\',\'DAYCARE\',\'PRE_AUTH\')',
      'CREATE TYPE nhcx_claim_record_status AS ENUM (\'DRAFT\',\'SUBMITTED\',\'UNDER_REVIEW\',\'QUERY_RAISED\',\'APPROVED\',\'PARTIALLY_APPROVED\',\'DENIED\',\'PAID\',\'EXPIRED\')',
      'CREATE TYPE abdm_flow_type AS ENUM (\'M1_ABHA_CREATION\',\'M2_KYC_LINK\',\'M3_HIU_CONSENT\')',
      'CREATE TYPE abdm_status AS ENUM (\'INITIATED\',\'OTP_SENT\',\'OTP_VERIFIED\',\'LINKED\',\'CONSENT_REQUESTED\',\'CONSENT_GRANTED\',\'CONSENT_DENIED\',\'FAILED\')',
      'CREATE TYPE follow_up_status AS ENUM (\'PENDING\',\'COMPLETED\',\'MISSED\',\'CANCELLED\')',
      'CREATE TYPE priority_level AS ENUM (\'LOW\',\'MEDIUM\',\'HIGH\')',
      'CREATE TYPE crm_campaign_status AS ENUM (\'DRAFT\',\'SCHEDULED\',\'RUNNING\',\'COMPLETED\',\'CANCELLED\')',
      'CREATE TYPE notification_channel AS ENUM (\'SMS\',\'WHATSAPP\',\'EMAIL\',\'PUSH\')',
      'CREATE TYPE notification_status AS ENUM (\'QUEUED\',\'SENT\',\'DELIVERED\',\'FAILED\')',
      'CREATE TYPE otp_purpose AS ENUM (\'LOGIN\',\'PHARMACY_DISPENSE\',\'PATIENT_CONSENT\')',
    ];

    for (const enumType of enumTypes) {
      try {
        await queryRunner.query(enumType);
      } catch (error) {
        // Enum type might already exist, continue
        console.log(`Note: ${enumType.split(' ')[2]} might already exist`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all tables in reverse order of creation
    const tables = [
      'refresh_tokens',
      'otps',
      'audit_logs',
      'dispense_records',
      'pharmacy_inventory',
      'staff_shifts',
      'notification_templates',
      'notification_logs',
      'crm_campaigns',
      'patient_segments',
      'follow_ups',
      'abdm_records',
      'nhcx_claim_records',
      'insurance_pre_auths',
      'nhcx_claims',
      'payment_transactions',
      'bill_items',
      'bills',
      'ot_bookings',
      'ward_inventory',
      'consumable_consumptions',
      'consumable_items',
      'maintenance_logs',
      'equipment_leases',
      'equipment',
      'housekeeping_logs',
      'beds',
      'rooms',
      'lab_results',
      'lab_orders',
      'mar',
      'triages',
      'vitals',
      'icd10',
      'prescription_items',
      'prescriptions',
      'consultations',
      'ward_round_stops',
      'ward_rounds',
      'discharge_summaries',
      'patient_admissions',
      'visits',
      'patient_consents',
      'patients',
      'facility_settings',
      'users',
      'facilities',
    ];

    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }

    // Drop ENUM types
    const enumTypes = [
      'facility_type',
      'subscription_plan',
      'user_role',
      'patient_gender',
      'consent_type',
      'visit_type',
      'visit_status',
      'payment_status',
      'prescription_status',
      'drug_form',
      'frequency',
      'prescription_item_status',
      'triage_category',
      'mar_status',
      'lab_order_status',
      'lab_partner',
      'lab_result_status',
      'equipment_category',
      'ownership_type',
      'equipment_status',
      'equipment_returned_condition',
      'equipment_lease_status',
      'maintenance_type',
      'maintenance_status',
      'bill_status',
      'bill_item_type',
      'payment_mode',
      'transaction_status',
      'nhcx_claim_status',
      'nhcx_claim_record_type',
      'nhcx_claim_record_status',
      'abdm_flow_type',
      'abdm_status',
      'follow_up_status',
      'priority_level',
      'crm_campaign_status',
      'notification_channel',
      'notification_status',
      'otp_purpose',
    ];

    for (const enumType of enumTypes) {
      await queryRunner.query(`DROP TYPE IF EXISTS ${enumType} CASCADE`);
    }
  }
}
