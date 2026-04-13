-- ============================================================
-- SmartOPD – Full Database Schema (MySQL)
-- Generated from TypeORM entity definitions
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. facilities
CREATE TABLE IF NOT EXISTS `facilities` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `registration_number` VARCHAR(100) DEFAULT NULL,
  `type` ENUM('HOSPITAL','CLINIC','DIAGNOSTIC') NOT NULL DEFAULT 'HOSPITAL',
  `address` TEXT DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `state` VARCHAR(100) DEFAULT NULL,
  `pincode` VARCHAR(10) DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `gst_number` VARCHAR(20) DEFAULT NULL,
  `abha_facility_id` VARCHAR(100) DEFAULT NULL,
  `abdm_hip_id` VARCHAR(200) DEFAULT NULL,
  `abdm_client_id` VARCHAR(200) DEFAULT NULL,
  `nabh_accreditation` VARCHAR(100) DEFAULT NULL,
  `website_url` VARCHAR(200) DEFAULT NULL,
  `fax_number` VARCHAR(20) DEFAULT NULL,
  `favicon_url` VARCHAR(500) DEFAULT NULL,
  `logo_url` VARCHAR(500) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `approval_status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `subscription_plan` ENUM('STARTER','GROWTH','SCALE','ENTERPRISE') NOT NULL DEFAULT 'STARTER',
  `subscription_expires_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. users
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `role` ENUM('SUPER_ADMIN','FACILITY_ADMIN','DOCTOR','NURSE','RECEPTIONIST','PHARMACIST','EQUIPMENT_STAFF','CRM_ANALYST') NOT NULL DEFAULT 'RECEPTIONIST',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_login_at` DATETIME DEFAULT NULL,
  `invite_token` VARCHAR(255) DEFAULT NULL,
  `invite_expires_at` DATETIME DEFAULT NULL,
  `profile_photo` VARCHAR(500) DEFAULT NULL,
  `doctor_profile` TEXT DEFAULT NULL,
  `nurse_profile` TEXT DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. facility_settings
CREATE TABLE IF NOT EXISTS `facility_settings` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `opd_start_time` VARCHAR(10) NOT NULL DEFAULT '09:00',
  `opd_end_time` VARCHAR(10) NOT NULL DEFAULT '18:00',
  `slot_duration_minutes` INT NOT NULL DEFAULT 15,
  `enable_sms` TINYINT(1) NOT NULL DEFAULT 1,
  `enable_whatsapp` TINYINT(1) NOT NULL DEFAULT 0,
  `default_currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `nhcx_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `pharmacy_otp_required` TINYINT(1) NOT NULL DEFAULT 1,
  `consultation_fee_default` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `letterhead_html` TEXT DEFAULT NULL,
  `brand_name` VARCHAR(100) DEFAULT NULL,
  `primary_color` VARCHAR(7) DEFAULT NULL,
  `secondary_color` VARCHAR(7) DEFAULT NULL,
  `accent_color` VARCHAR(7) DEFAULT NULL,
  `font_family` VARCHAR(100) DEFAULT NULL,
  `logo_url` VARCHAR(500) DEFAULT NULL,
  `favicon_url` VARCHAR(500) DEFAULT NULL,
  `support_phone` VARCHAR(100) DEFAULT NULL,
  `support_email` VARCHAR(150) DEFAULT NULL,
  `welcome_message` TEXT DEFAULT NULL,
  `footer_text` TEXT DEFAULT NULL,
  `custom_css_url` VARCHAR(200) DEFAULT NULL,
  `show_powered_by` TINYINT(1) NOT NULL DEFAULT 0,
  `default_language` VARCHAR(10) NOT NULL DEFAULT 'en',
  `enable_face_kiosk` TINYINT(1) NOT NULL DEFAULT 0,
  `enable_opd_queue` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_facility_settings_facility_id` (`facility_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. patients
CREATE TABLE IF NOT EXISTS `patients` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `mrn` VARCHAR(30) DEFAULT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `date_of_birth` DATE NOT NULL,
  `gender` ENUM('MALE','FEMALE','OTHER','PREFER_NOT_TO_SAY') NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `alternate_phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `city` VARCHAR(100) DEFAULT NULL,
  `state` VARCHAR(100) DEFAULT NULL,
  `pincode` VARCHAR(10) DEFAULT NULL,
  `blood_group` VARCHAR(5) DEFAULT NULL,
  `abha_number` VARCHAR(20) DEFAULT NULL,
  `abha_address` VARCHAR(100) DEFAULT NULL,
  `aadhar_last_four` VARCHAR(4) DEFAULT NULL,
  `aadhaar_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `emergency_contact_name` VARCHAR(100) DEFAULT NULL,
  `emergency_contact_phone` VARCHAR(20) DEFAULT NULL,
  `allergies` TEXT DEFAULT NULL,
  `chronic_conditions` TEXT DEFAULT NULL,
  `insurance_info` TEXT DEFAULT NULL,
  `fhir_patient_json` LONGTEXT DEFAULT NULL,
  `abha_linked_at` TIMESTAMP NULL DEFAULT NULL,
  `photo_url` VARCHAR(500) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. patient_consents
CREATE TABLE IF NOT EXISTS `patient_consents` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `patient_id` VARCHAR(255) NOT NULL,
  `consent_type` ENUM('TREATMENT','DATA_SHARING','ABHA_LINK','RESEARCH') NOT NULL,
  `consent_given_at` DATETIME NOT NULL,
  `consent_given_by` VARCHAR(255) DEFAULT NULL,
  `is_guardian` TINYINT(1) NOT NULL DEFAULT 0,
  `guardian_relation` VARCHAR(50) DEFAULT NULL,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `revoked_at` DATETIME DEFAULT NULL,
  `document_url` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. visits
CREATE TABLE IF NOT EXISTS `visits` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `visit_number` VARCHAR(255) NOT NULL,
  `patient_id` VARCHAR(255) NOT NULL,
  `doctor_id` VARCHAR(255) DEFAULT NULL,
  `registered_by_id` VARCHAR(255) NOT NULL,
  `visit_type` ENUM('OPD','EMERGENCY','FOLLOW_UP','TELE') NOT NULL,
  `status` ENUM('REGISTERED','WAITING','WITH_NURSE','WITH_DOCTOR','COMPLETED','CANCELLED','NO_SHOW') NOT NULL DEFAULT 'REGISTERED',
  `scheduled_at` DATETIME DEFAULT NULL,
  `checked_in_at` DATETIME DEFAULT NULL,
  `nurse_seen_at` DATETIME DEFAULT NULL,
  `doctor_seen_at` DATETIME DEFAULT NULL,
  `completed_at` DATETIME DEFAULT NULL,
  `token_number` INT NOT NULL DEFAULT 0,
  `chief_complaint` TEXT DEFAULT NULL,
  `visit_notes` TEXT DEFAULT NULL,
  `follow_up_date` DATE DEFAULT NULL,
  `follow_up_instructions` TEXT DEFAULT NULL,
  `is_tele_consult` TINYINT(1) NOT NULL DEFAULT 0,
  `tele_consult_link` VARCHAR(255) DEFAULT NULL,
  `fhir_encounter_json` LONGTEXT DEFAULT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('PENDING','PARTIAL','PAID','WAIVED') NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. patient_admissions
CREATE TABLE IF NOT EXISTS `patient_admissions` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `admissionNumber` VARCHAR(20) DEFAULT NULL,
  `patientId` VARCHAR(255) NOT NULL,
  `sourceVisitId` VARCHAR(255) DEFAULT NULL,
  `admittingDoctorId` VARCHAR(255) NOT NULL,
  `primaryNurseId` VARCHAR(255) DEFAULT NULL,
  `bedId` VARCHAR(255) NOT NULL,
  `wardId` VARCHAR(255) NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'pending',
  `admissionType` VARCHAR(20) NOT NULL,
  `chiefComplaint` VARCHAR(255) NOT NULL,
  `icd10Codes` TEXT DEFAULT NULL,
  `nhcxPreAuthId` VARCHAR(255) DEFAULT NULL,
  `nhcxPreAuthStatus` VARCHAR(255) DEFAULT NULL,
  `nhcxApprovedAmount` DECIMAL(12,2) DEFAULT NULL,
  `attendantName` VARCHAR(255) DEFAULT NULL,
  `attendantPhone` VARCHAR(255) DEFAULT NULL,
  `wristbandNumber` VARCHAR(255) DEFAULT NULL,
  `expectedDischargeDate` DATE DEFAULT NULL,
  `admittedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `dischargeInitiatedAt` TIMESTAMP DEFAULT NULL,
  `dischargedAt` TIMESTAMP DEFAULT NULL,
  `dischargeType` VARCHAR(20) DEFAULT NULL,
  `dischargeNotes` TEXT DEFAULT NULL,
  `fhirDischargePublishedAt` TIMESTAMP DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_admissions_admissionNumber` (`admissionNumber`),
  UNIQUE KEY `UQ_admissions_wristbandNumber` (`wristbandNumber`),
  INDEX `IDX_admissions_facility_id` (`facility_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. discharge_summaries
CREATE TABLE IF NOT EXISTS `discharge_summaries` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `admissionId` VARCHAR(255) NOT NULL,
  `patientId` VARCHAR(255) NOT NULL,
  `dischargedById` VARCHAR(255) NOT NULL,
  `finalDiagnosis` TEXT DEFAULT NULL,
  `hospitalCourse` TEXT DEFAULT NULL,
  `proceduresPerformed` TEXT DEFAULT NULL,
  `medicationsOnDischarge` TEXT DEFAULT NULL,
  `dischargeInstructions` TEXT DEFAULT NULL,
  `followUpDate` VARCHAR(255) DEFAULT NULL,
  `followUpDoctor` VARCHAR(255) DEFAULT NULL,
  `followUpNotes` VARCHAR(255) DEFAULT NULL,
  `fhirSummaryJson` TEXT DEFAULT NULL,
  `lengthOfStayDays` SMALLINT DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. ward_rounds
CREATE TABLE IF NOT EXISTS `ward_rounds` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `admissionId` VARCHAR(255) NOT NULL,
  `conductedById` VARCHAR(255) NOT NULL,
  `conductedAt` TIMESTAMP NOT NULL,
  `wardId` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. ward_round_stops
CREATE TABLE IF NOT EXISTS `ward_round_stops` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `wardRoundId` VARCHAR(255) NOT NULL,
  `admissionId` VARCHAR(255) NOT NULL,
  `bedId` VARCHAR(255) NOT NULL,
  `patientId` VARCHAR(255) NOT NULL,
  `stopOrder` INT NOT NULL DEFAULT 0,
  `subjectiveNotes` TEXT DEFAULT NULL,
  `objectiveNotes` TEXT DEFAULT NULL,
  `assessmentNotes` TEXT DEFAULT NULL,
  `planNotes` TEXT DEFAULT NULL,
  `vitalSummary` TEXT DEFAULT NULL,
  `flagged` TINYINT(1) NOT NULL DEFAULT 0,
  `flagReason` TEXT DEFAULT NULL,
  `conductedAt` TIMESTAMP NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. consultations
CREATE TABLE IF NOT EXISTS `consultations` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `visit_id` VARCHAR(255) NOT NULL,
  `doctor_id` VARCHAR(255) NOT NULL,
  `patient_id` VARCHAR(255) DEFAULT NULL,
  `chief_complaint` TEXT DEFAULT NULL,
  `history_of_present_illness` TEXT DEFAULT NULL,
  `past_medical_history` TEXT DEFAULT NULL,
  `family_history` TEXT DEFAULT NULL,
  `physical_examination` TEXT DEFAULT NULL,
  `investigations` TEXT DEFAULT NULL,
  `diagnoses` TEXT DEFAULT NULL,
  `clinical_notes` TEXT DEFAULT NULL,
  `advice` TEXT DEFAULT NULL,
  `follow_up_date` DATE DEFAULT NULL,
  `follow_up_instructions` TEXT DEFAULT NULL,
  `referred_to_specialty` VARCHAR(255) DEFAULT NULL,
  `referral_notes` TEXT DEFAULT NULL,
  `fhir_composition_json` LONGTEXT DEFAULT NULL,
  `is_complete` TINYINT(1) NOT NULL DEFAULT 0,
  `completed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_consultations_visit_id` (`visit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. prescriptions
CREATE TABLE IF NOT EXISTS `prescriptions` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `visit_id` VARCHAR(255) NOT NULL,
  `consultation_id` VARCHAR(255) DEFAULT NULL,
  `patient_id` VARCHAR(255) DEFAULT NULL,
  `prescribed_by_id` VARCHAR(255) NOT NULL,
  `prescription_date` DATE NOT NULL,
  `status` ENUM('DRAFT','FINALIZED','PARTIALLY_DISPENSED','FULLY_DISPENSED') NOT NULL DEFAULT 'DRAFT',
  `notes` TEXT DEFAULT NULL,
  `fhir_medication_request_json` LONGTEXT DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. prescription_items
CREATE TABLE IF NOT EXISTS `prescription_items` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `prescription_id` VARCHAR(255) NOT NULL,
  `drug_name` VARCHAR(255) NOT NULL,
  `generic_name` VARCHAR(255) DEFAULT NULL,
  `form` ENUM('TABLET','CAPSULE','SYRUP','INJECTION','CREAM','DROPS','INHALER','PATCH','OTHER') NOT NULL,
  `strength` VARCHAR(255) DEFAULT NULL,
  `dose` VARCHAR(255) NOT NULL,
  `frequency` ENUM('OD','BD','TDS','QID','SOS','STAT','WEEKLY') NOT NULL,
  `route` VARCHAR(255) NOT NULL DEFAULT 'ORAL',
  `duration_days` INT DEFAULT NULL,
  `quantity` INT DEFAULT NULL,
  `instructions` TEXT DEFAULT NULL,
  `is_generic_substitutable` TINYINT(1) NOT NULL DEFAULT 1,
  `status` ENUM('ACTIVE','DISPENSED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. icd10
CREATE TABLE IF NOT EXISTS `icd10` (
  `id` VARCHAR(36) NOT NULL,
  `code` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `category_code` VARCHAR(255) DEFAULT NULL,
  `category_description` VARCHAR(255) DEFAULT NULL,
  `is_common` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_icd10_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. vitals
CREATE TABLE IF NOT EXISTS `vitals` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `visit_id` VARCHAR(255) NOT NULL,
  `patient_id` VARCHAR(255) DEFAULT NULL,
  `recorded_by_id` VARCHAR(255) NOT NULL,
  `temperature_celsius` DECIMAL(5,2) DEFAULT NULL,
  `temperature_site` VARCHAR(255) DEFAULT NULL,
  `pulse_bpm` INT DEFAULT NULL,
  `respiratory_rate` INT DEFAULT NULL,
  `systolic_bp` INT DEFAULT NULL,
  `diastolic_bp` INT DEFAULT NULL,
  `sp_o2` DECIMAL(5,2) DEFAULT NULL,
  `height_cm` DECIMAL(6,2) DEFAULT NULL,
  `weight_kg` DECIMAL(6,2) DEFAULT NULL,
  `bmi` DECIMAL(5,2) DEFAULT NULL,
  `pain_score` INT DEFAULT NULL,
  `blood_glucose` DECIMAL(6,2) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `is_critical` TINYINT(1) NOT NULL DEFAULT 0,
  `critical_flags` TEXT DEFAULT NULL,
  `recorded_at` DATETIME NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. triages
CREATE TABLE IF NOT EXISTS `triages` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `visit_id` VARCHAR(255) NOT NULL,
  `triage_by_id` VARCHAR(255) NOT NULL,
  `triage_category` ENUM('RED','ORANGE','YELLOW','GREEN','BLUE') NOT NULL,
  `chief_complaint` TEXT NOT NULL,
  `triage_notes` TEXT DEFAULT NULL,
  `triage_at` DATETIME NOT NULL,
  `overridden_by` VARCHAR(255) DEFAULT NULL,
  `override_reason` TEXT DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_triages_visit_id` (`visit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. mar
CREATE TABLE IF NOT EXISTS `mar` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `visit_id` VARCHAR(255) NOT NULL,
  `patient_id` VARCHAR(255) NOT NULL,
  `prescription_item_id` VARCHAR(255) DEFAULT NULL,
  `administered_by_id` VARCHAR(255) NOT NULL,
  `drug_name` VARCHAR(255) NOT NULL,
  `dose` VARCHAR(255) NOT NULL,
  `route` VARCHAR(255) NOT NULL,
  `scheduled_at` DATETIME NOT NULL,
  `administered_at` DATETIME DEFAULT NULL,
  `status` ENUM('SCHEDULED','ADMINISTERED','HELD','MISSED') NOT NULL DEFAULT 'SCHEDULED',
  `hold_reason` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. lab_orders
CREATE TABLE IF NOT EXISTS `lab_orders` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `patient_id` VARCHAR(255) NOT NULL,
  `visit_id` VARCHAR(255) NOT NULL,
  `ordered_by_id` VARCHAR(255) NOT NULL,
  `status` ENUM('ORDERED','SENT_TO_LAB','SAMPLE_COLLECTED','PROCESSING','RESULTED','CANCELLED') NOT NULL DEFAULT 'ORDERED',
  `partner` ENUM('IN_HOUSE','SRL','THYROCARE','DR_LAL','METROPOLIS') NOT NULL DEFAULT 'IN_HOUSE',
  `test_name` VARCHAR(200) NOT NULL,
  `loinc_code` VARCHAR(50) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `external_order_id` VARCHAR(100) DEFAULT NULL,
  `fhir_service_request` LONGTEXT DEFAULT NULL,
  `urgency` VARCHAR(20) NOT NULL DEFAULT 'ROUTINE',
  `sent_to_lab_at` TIMESTAMP NULL DEFAULT NULL,
  `resulted_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `IDX_lab_orders_facility_id` (`facility_id`),
  INDEX `IDX_lab_orders_patient_id` (`patient_id`),
  INDEX `IDX_lab_orders_visit_id` (`visit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. lab_results
CREATE TABLE IF NOT EXISTS `lab_results` (
  `id` VARCHAR(36) NOT NULL,
  `lab_order_id` VARCHAR(255) NOT NULL,
  `patient_id` VARCHAR(255) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `component_name` VARCHAR(200) NOT NULL,
  `loinc_code` VARCHAR(100) DEFAULT NULL,
  `value` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(50) DEFAULT NULL,
  `reference_range` VARCHAR(200) DEFAULT NULL,
  `status` ENUM('NORMAL','ABNORMAL_HIGH','ABNORMAL_LOW','CRITICAL_HIGH','CRITICAL_LOW','PENDING') NOT NULL DEFAULT 'PENDING',
  `fhir_observation` LONGTEXT DEFAULT NULL,
  `interpretation` VARCHAR(200) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `IDX_lab_results_lab_order_id` (`lab_order_id`),
  INDEX `IDX_lab_results_patient_id` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. rooms
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(30) NOT NULL,
  `building` VARCHAR(255) DEFAULT NULL,
  `floor` VARCHAR(255) DEFAULT NULL,
  `ward` VARCHAR(255) DEFAULT NULL,
  `capacity` INT NOT NULL DEFAULT 1,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` VARCHAR(255) DEFAULT NULL,
  `features` TEXT DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 21. beds
CREATE TABLE IF NOT EXISTS `beds` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `roomId` VARCHAR(255) NOT NULL,
  `bedNumber` VARCHAR(255) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
  `currentPatientId` VARCHAR(255) DEFAULT NULL,
  `currentAdmissionId` VARCHAR(255) DEFAULT NULL,
  `hasVentilator` TINYINT(1) NOT NULL DEFAULT 0,
  `hasMonitor` TINYINT(1) NOT NULL DEFAULT 0,
  `hasCallBell` TINYINT(1) NOT NULL DEFAULT 0,
  `hasIvRack` TINYINT(1) NOT NULL DEFAULT 0,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` VARCHAR(255) DEFAULT NULL,
  `roomType` VARCHAR(30) DEFAULT NULL,
  `lastOccupiedBy` VARCHAR(255) DEFAULT NULL,
  `lastCleanedAt` TIMESTAMP NULL DEFAULT NULL,
  `lastCleanedBy` VARCHAR(255) DEFAULT NULL,
  `cleaningStartedAt` TIMESTAMP NULL DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 22. housekeeping_logs
CREATE TABLE IF NOT EXISTS `housekeeping_logs` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `bedId` VARCHAR(255) NOT NULL,
  `startedAt` TIMESTAMP NOT NULL,
  `completedAt` TIMESTAMP DEFAULT NULL,
  `completedById` VARCHAR(255) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
  `slaMinutes` INT NOT NULL DEFAULT 30,
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 23. equipment
CREATE TABLE IF NOT EXISTS `equipment` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `brand` VARCHAR(255) DEFAULT NULL,
  `model` VARCHAR(255) DEFAULT NULL,
  `serial_number` VARCHAR(255) DEFAULT NULL,
  `asset_tag` VARCHAR(255) DEFAULT NULL,
  `qr_code` VARCHAR(255) DEFAULT NULL,
  `category` ENUM('DIAGNOSTIC','SURGICAL','MONITORING','IT','FURNITURE','OTHER','WHEELCHAIR','OXYGEN_CYLINDER') NOT NULL,
  `ownership_type` ENUM('OWNED','LEASED','RENTAL') NOT NULL DEFAULT 'OWNED',
  `purchase_date` DATE DEFAULT NULL,
  `purchase_price` DECIMAL(12,2) DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('AVAILABLE','LEASED_OUT','UNDER_MAINTENANCE','DECOMMISSIONED') NOT NULL DEFAULT 'AVAILABLE',
  `warranty_expires_at` DATE DEFAULT NULL,
  `next_maintenance_due` DATE DEFAULT NULL,
  `maintenance_frequency_days` INT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `photo_url` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_equipment_qr_code` (`qr_code`),
  INDEX `IDX_equipment_next_maintenance_due` (`next_maintenance_due`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 24. equipment_leases
CREATE TABLE IF NOT EXISTS `equipment_leases` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `equipment_id` VARCHAR(255) NOT NULL,
  `patient_id` VARCHAR(255) NOT NULL,
  `visit_id` VARCHAR(255) DEFAULT NULL,
  `issued_by_id` VARCHAR(255) NOT NULL,
  `issued_at` DATETIME NOT NULL,
  `due_date` DATE NOT NULL,
  `returned_at` DATETIME DEFAULT NULL,
  `returned_condition` ENUM('GOOD','DAMAGED','MISSING') DEFAULT NULL,
  `deposit_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `deposit_mode` VARCHAR(255) DEFAULT NULL,
  `deposit_settled` TINYINT(1) NOT NULL DEFAULT 0,
  `notes` TEXT DEFAULT NULL,
  `status` ENUM('ACTIVE','RETURNED','OVERDUE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `IDX_equipment_leases_due_date` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 25. maintenance_logs
CREATE TABLE IF NOT EXISTS `maintenance_logs` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `equipment_id` VARCHAR(255) NOT NULL,
  `performed_by_id` VARCHAR(255) DEFAULT NULL,
  `maintenance_type` ENUM('PREVENTIVE','CORRECTIVE','CALIBRATION','INSPECTION') NOT NULL,
  `scheduled_date` DATE NOT NULL,
  `performed_date` DATE DEFAULT NULL,
  `vendor_name` VARCHAR(255) DEFAULT NULL,
  `cost` DECIMAL(10,2) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `next_due_date` DATE DEFAULT NULL,
  `status` ENUM('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'SCHEDULED',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 26. consumable_items
CREATE TABLE IF NOT EXISTS `consumable_items` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `itemCode` VARCHAR(255) NOT NULL,
  `itemName` VARCHAR(255) NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `unit` VARCHAR(255) NOT NULL,
  `unitCost` DECIMAL(10,2) NOT NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 27. consumable_consumptions
CREATE TABLE IF NOT EXISTS `consumable_consumptions` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `wardId` VARCHAR(255) NOT NULL,
  `admissionId` VARCHAR(255) DEFAULT NULL,
  `consumableItemId` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL,
  `usedBy` VARCHAR(255) NOT NULL,
  `usedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `purpose` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `IDX_consumable_consumptions_wardId` (`wardId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 28. ward_inventory
CREATE TABLE IF NOT EXISTS `ward_inventory` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `wardId` VARCHAR(255) NOT NULL,
  `consumableItemId` VARCHAR(255) NOT NULL,
  `currentStock` INT NOT NULL DEFAULT 0,
  `reorderLevel` INT NOT NULL DEFAULT 10,
  `lastRestockedAt` TIMESTAMP NULL DEFAULT NULL,
  `lastRestockedQuantity` INT DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_ward_inventory_facility_ward_item` (`facility_id`,`wardId`,`consumableItemId`),
  INDEX `IDX_ward_inventory_wardId` (`wardId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 29. ot_bookings
CREATE TABLE IF NOT EXISTS `ot_bookings` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `patientId` VARCHAR(255) NOT NULL,
  `admissionId` VARCHAR(255) DEFAULT NULL,
  `surgeonId` VARCHAR(255) NOT NULL,
  `anaesthetistId` VARCHAR(255) DEFAULT NULL,
  `otRoomId` VARCHAR(255) NOT NULL,
  `scheduledStart` TIMESTAMP NOT NULL,
  `scheduledEnd` TIMESTAMP NOT NULL,
  `actualStart` TIMESTAMP DEFAULT NULL,
  `actualEnd` TIMESTAMP DEFAULT NULL,
  `procedureName` VARCHAR(255) NOT NULL,
  `cptCodes` TEXT DEFAULT NULL,
  `urgency` VARCHAR(20) NOT NULL DEFAULT 'elective',
  `status` VARCHAR(20) NOT NULL DEFAULT 'booked',
  `postOpBedId` VARCHAR(255) DEFAULT NULL,
  `preOpChecklist` TEXT DEFAULT NULL,
  `preOpChecklistCompletedAt` TIMESTAMP DEFAULT NULL,
  `intraOpNotes` TEXT DEFAULT NULL,
  `postOpNotes` TEXT DEFAULT NULL,
  `cancelledReason` TEXT DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `IDX_ot_bookings_patientId` (`patientId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 30. bills
CREATE TABLE IF NOT EXISTS `bills` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `visit_id` VARCHAR(255) DEFAULT NULL,
  `patient_id` VARCHAR(255) NOT NULL,
  `bill_number` VARCHAR(255) NOT NULL,
  `bill_date` DATE NOT NULL,
  `consultation_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `medicine_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `procedure_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `diagnostic_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `misc_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `due_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('DRAFT','FINALIZED','PARTIAL','PAID','CANCELLED','REFUNDED') NOT NULL DEFAULT 'DRAFT',
  `insurance_covered` TINYINT(1) NOT NULL DEFAULT 0,
  `insurance_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `notes` TEXT DEFAULT NULL,
  `generated_by_id` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_bills_visit_id` (`visit_id`),
  UNIQUE KEY `UQ_bills_bill_number` (`bill_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 31. bill_items
CREATE TABLE IF NOT EXISTS `bill_items` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `bill_id` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `item_type` ENUM('CONSULTATION','MEDICINE','PROCEDURE','DIAGNOSTIC','MISC','PHARMACY','LAB','OTHER') NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `gst_percent` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `hsn_sac_code` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 32. payment_transactions
CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `bill_id` VARCHAR(255) NOT NULL,
  `patient_id` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_mode` ENUM('CASH','UPI','CARD','NEFT','INSURANCE','WAIVED') NOT NULL,
  `upi_transaction_id` VARCHAR(255) DEFAULT NULL,
  `upi_ref_number` VARCHAR(255) DEFAULT NULL,
  `card_last4` VARCHAR(255) DEFAULT NULL,
  `payment_gateway` VARCHAR(255) DEFAULT NULL,
  `gateway_transaction_id` VARCHAR(255) DEFAULT NULL,
  `gateway_response` TEXT DEFAULT NULL,
  `status` ENUM('INITIATED','SUCCESS','FAILED','REFUNDED') NOT NULL DEFAULT 'INITIATED',
  `paid_at` DATETIME DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `received_by_id` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 33. nhcx_claims
CREATE TABLE IF NOT EXISTS `nhcx_claims` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `visit_id` VARCHAR(255) NOT NULL,
  `bill_id` VARCHAR(255) NOT NULL,
  `patient_id` VARCHAR(255) NOT NULL,
  `insurer_name` VARCHAR(255) NOT NULL,
  `policy_number` VARCHAR(255) DEFAULT NULL,
  `claim_amount` DECIMAL(10,2) NOT NULL,
  `approved_amount` DECIMAL(10,2) DEFAULT NULL,
  `nhcx_claim_id` VARCHAR(255) DEFAULT NULL,
  `nhcx_status` ENUM('SUBMITTED','PENDING','APPROVED','REJECTED','SETTLED') NOT NULL DEFAULT 'PENDING',
  `submitted_at` DATETIME NOT NULL,
  `settled_at` DATETIME DEFAULT NULL,
  `rejection_reason` TEXT DEFAULT NULL,
  `nhcx_response_json` TEXT DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 34. insurance_pre_auths
CREATE TABLE IF NOT EXISTS `insurance_pre_auths` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `patientId` VARCHAR(255) NOT NULL,
  `admissionId` VARCHAR(255) DEFAULT NULL,
  `visitId` VARCHAR(255) DEFAULT NULL,
  `insurerName` VARCHAR(255) NOT NULL,
  `policyNumber` VARCHAR(255) DEFAULT NULL,
  `tpaName` VARCHAR(255) DEFAULT NULL,
  `diagnosisCodes` TEXT DEFAULT NULL,
  `requestedProcedures` TEXT DEFAULT NULL,
  `estimatedCost` DECIMAL(10,2) NOT NULL,
  `approvedAmount` DECIMAL(10,2) DEFAULT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'draft',
  `referenceNumber` VARCHAR(255) DEFAULT NULL,
  `submittedAt` TIMESTAMP NULL DEFAULT NULL,
  `respondedAt` TIMESTAMP NULL DEFAULT NULL,
  `rejectionReason` TEXT DEFAULT NULL,
  `insurerResponseJson` TEXT DEFAULT NULL,
  `requestedById` VARCHAR(255) NOT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 35. nhcx_claim_records
CREATE TABLE IF NOT EXISTS `nhcx_claim_records` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `patient_id` VARCHAR(255) NOT NULL,
  `visit_id` VARCHAR(255) DEFAULT NULL,
  `admission_id` VARCHAR(255) DEFAULT NULL,
  `bill_id` VARCHAR(255) DEFAULT NULL,
  `claim_type` ENUM('OPD','IPD','SURGERY','DAYCARE','PRE_AUTH') NOT NULL,
  `status` ENUM('DRAFT','SUBMITTED','UNDER_REVIEW','QUERY_RAISED','APPROVED','PARTIALLY_APPROVED','DENIED','PAID','EXPIRED') NOT NULL DEFAULT 'DRAFT',
  `nhcx_claim_id` VARCHAR(100) DEFAULT NULL,
  `payer_name` VARCHAR(200) DEFAULT NULL,
  `policy_number` VARCHAR(100) DEFAULT NULL,
  `member_id` VARCHAR(100) DEFAULT NULL,
  `claimed_amount` DECIMAL(12,2) DEFAULT NULL,
  `approved_amount` DECIMAL(12,2) DEFAULT NULL,
  `fhir_bundle` LONGTEXT DEFAULT NULL,
  `nhcx_response` LONGTEXT DEFAULT NULL,
  `denial_reason` TEXT DEFAULT NULL,
  `query_text` TEXT DEFAULT NULL,
  `submitted_at` TIMESTAMP NULL DEFAULT NULL,
  `resolved_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `IDX_nhcx_claim_records_facility_id` (`facility_id`),
  INDEX `IDX_nhcx_claim_records_patient_id` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 36. abdm_records
CREATE TABLE IF NOT EXISTS `abdm_records` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `patient_id` VARCHAR(255) NOT NULL,
  `flow_type` ENUM('M1_ABHA_CREATION','M2_KYC_LINK','M3_HIU_CONSENT') NOT NULL,
  `status` ENUM('INITIATED','OTP_SENT','OTP_VERIFIED','LINKED','CONSENT_REQUESTED','CONSENT_GRANTED','CONSENT_DENIED','FAILED') NOT NULL DEFAULT 'INITIATED',
  `abha_number` VARCHAR(30) DEFAULT NULL,
  `abha_address` VARCHAR(100) DEFAULT NULL,
  `txn_id` VARCHAR(100) DEFAULT NULL,
  `consent_artefact_id` VARCHAR(100) DEFAULT NULL,
  `access_token_encrypted` TEXT DEFAULT NULL,
  `raw_response` LONGTEXT DEFAULT NULL,
  `error_code` VARCHAR(50) DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `IDX_abdm_records_facility_id` (`facility_id`),
  INDEX `IDX_abdm_records_patient_id` (`patient_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 37. follow_ups
CREATE TABLE IF NOT EXISTS `follow_ups` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `patient_id` VARCHAR(255) NOT NULL,
  `visit_id` VARCHAR(255) DEFAULT NULL,
  `assigned_to_id` VARCHAR(255) DEFAULT NULL,
  `follow_up_date` DATE NOT NULL,
  `reason` TEXT DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `status` ENUM('PENDING','COMPLETED','MISSED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `completed_at` DATETIME DEFAULT NULL,
  `completed_by` VARCHAR(255) DEFAULT NULL,
  `notification_sent` TINYINT(1) NOT NULL DEFAULT 0,
  `notification_sent_at` DATETIME DEFAULT NULL,
  `priority` ENUM('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `IDX_follow_ups_follow_up_date` (`follow_up_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 38. patient_segments
CREATE TABLE IF NOT EXISTS `patient_segments` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `criteria` TEXT NOT NULL,
  `patient_count` INT NOT NULL DEFAULT 0,
  `last_refreshed_at` DATETIME DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 39. crm_campaigns
CREATE TABLE IF NOT EXISTS `crm_campaigns` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `segment_id` VARCHAR(255) DEFAULT NULL,
  `channel` VARCHAR(255) NOT NULL,
  `template_code` VARCHAR(255) DEFAULT NULL,
  `scheduled_at` DATETIME DEFAULT NULL,
  `sent_at` DATETIME DEFAULT NULL,
  `status` ENUM('DRAFT','SCHEDULED','RUNNING','COMPLETED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `total_recipients` INT NOT NULL DEFAULT 0,
  `sent_count` INT NOT NULL DEFAULT 0,
  `failed_count` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 40. notification_logs
CREATE TABLE IF NOT EXISTS `notification_logs` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `channel` ENUM('SMS','WHATSAPP','EMAIL','PUSH') NOT NULL,
  `recipient` VARCHAR(255) NOT NULL,
  `template_code` VARCHAR(255) DEFAULT NULL,
  `subject` VARCHAR(255) DEFAULT NULL,
  `body` TEXT NOT NULL,
  `status` ENUM('QUEUED','SENT','DELIVERED','FAILED') NOT NULL DEFAULT 'QUEUED',
  `external_id` VARCHAR(255) DEFAULT NULL,
  `error_message` TEXT DEFAULT NULL,
  `sent_at` DATETIME DEFAULT NULL,
  `related_entity_type` VARCHAR(255) DEFAULT NULL,
  `related_entity_id` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 41. notification_templates
CREATE TABLE IF NOT EXISTS `notification_templates` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `code` VARCHAR(255) NOT NULL,
  `channel` ENUM('SMS','WHATSAPP','EMAIL','PUSH') NOT NULL,
  `language` VARCHAR(255) NOT NULL DEFAULT 'en',
  `subject` VARCHAR(255) DEFAULT NULL,
  `body_template` TEXT NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 42. staff_shifts
CREATE TABLE IF NOT EXISTS `staff_shifts` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `staffId` VARCHAR(255) NOT NULL,
  `staffRole` VARCHAR(255) NOT NULL,
  `wardId` VARCHAR(255) DEFAULT NULL,
  `shiftType` VARCHAR(20) NOT NULL,
  `shiftDate` DATE NOT NULL,
  `startAt` TIMESTAMP NOT NULL,
  `endAt` TIMESTAMP NOT NULL,
  `actualStartAt` TIMESTAMP DEFAULT NULL,
  `actualEndAt` TIMESTAMP DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  `swappedWithStaffId` VARCHAR(255) DEFAULT NULL,
  `approvedBy` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` DATETIME(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `IDX_staff_shifts_wardId` (`wardId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 43. pharmacy_inventory
CREATE TABLE IF NOT EXISTS `pharmacy_inventory` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `drug_name` VARCHAR(255) NOT NULL,
  `generic_name` VARCHAR(255) DEFAULT NULL,
  `form` VARCHAR(255) NOT NULL,
  `strength` VARCHAR(255) DEFAULT NULL,
  `manufacturer` VARCHAR(255) DEFAULT NULL,
  `batch_number` VARCHAR(255) NOT NULL,
  `expiry_date` DATE NOT NULL,
  `quantity_in_stock` INT NOT NULL DEFAULT 0,
  `reorder_level` INT NOT NULL DEFAULT 10,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `mrp` DECIMAL(10,2) NOT NULL,
  `hsn_code` VARCHAR(255) DEFAULT NULL,
  `gst_percent` DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `storage_location` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `IDX_pharmacy_inventory_expiry_date` (`expiry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 44. dispense_records
CREATE TABLE IF NOT EXISTS `dispense_records` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) NOT NULL,
  `prescription_id` VARCHAR(255) NOT NULL,
  `prescription_item_id` VARCHAR(255) DEFAULT NULL,
  `patient_id` VARCHAR(255) NOT NULL,
  `dispensed_by_id` VARCHAR(255) NOT NULL,
  `drug_name` VARCHAR(255) NOT NULL,
  `generic_name` VARCHAR(255) DEFAULT NULL,
  `batch_number` VARCHAR(255) DEFAULT NULL,
  `expiry_date` DATE DEFAULT NULL,
  `quantity_dispensed` INT NOT NULL,
  `unit_price` DECIMAL(10,2) DEFAULT NULL,
  `total_price` DECIMAL(10,2) DEFAULT NULL,
  `dispensed_at` DATETIME NOT NULL,
  `otp_verified` TINYINT(1) NOT NULL DEFAULT 0,
  `otp_verified_at` DATETIME DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `returned_qty` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 45. audit_logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `user_id` VARCHAR(255) NOT NULL,
  `user_role` VARCHAR(255) DEFAULT NULL,
  `action` VARCHAR(255) NOT NULL,
  `resource` VARCHAR(255) NOT NULL,
  `resource_id` VARCHAR(255) DEFAULT NULL,
  `payload` LONGTEXT DEFAULT NULL,
  `ip_address` VARCHAR(255) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `status_code` INT DEFAULT NULL,
  `duration` INT DEFAULT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `IDX_audit_logs_facility_id` (`facility_id`),
  INDEX `IDX_audit_logs_user_id` (`user_id`),
  INDEX `IDX_audit_logs_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 46. otps
CREATE TABLE IF NOT EXISTS `otps` (
  `id` VARCHAR(36) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `code` VARCHAR(255) NOT NULL,
  `purpose` ENUM('LOGIN','PHARMACY_DISPENSE','PATIENT_CONSENT') NOT NULL DEFAULT 'LOGIN',
  `expires_at` DATETIME NOT NULL,
  `used` TINYINT(1) NOT NULL DEFAULT 0,
  `attempts` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 47. refresh_tokens
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(255) NOT NULL,
  `facility_id` VARCHAR(255) DEFAULT NULL,
  `selector` VARCHAR(36) NOT NULL,
  `token` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `revoked` TINYINT(1) NOT NULL DEFAULT 0,
  `ip_address` VARCHAR(50) DEFAULT NULL,
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `UQ_refresh_tokens_selector` (`selector`),
  INDEX `IDX_refresh_tokens_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
