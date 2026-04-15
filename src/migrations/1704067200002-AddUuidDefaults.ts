import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix UUID defaults for all tables
 *
 * The previous migration created id columns without default values.
 * This migration adds uuid_generate_v4() as the default for all id columns.
 */
export class AddUuidDefaults1704067200002 implements MigrationInterface {
  name = 'AddUuidDefaults1704067200002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid-ossp extension for UUID generation
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    // Get all tables with an 'id' column
    const tables = [
      'facilities',
      'users',
      'facility_settings',
      'patients',
      'patient_consents',
      'visits',
      'patient_admissions',
      'discharge_summaries',
      'ward_rounds',
      'ward_round_stops',
      'vitals',
      'triage',
      'mar',
      'consultations',
      'prescriptions',
      'prescription_items',
      'icd10',
      'dispense_records',
      'pharmacy_inventory',
      'equipment',
      'equipment_leases',
      'maintenance_logs',
      'bills',
      'bill_items',
      'payment_transactions',
      'nhcx_claims',
      'notification_logs',
      'notification_templates',
      'follow_ups',
      'patient_segments',
      'crm_campaigns',
      'audit_logs',
      'rooms',
      'beds',
      'housekeeping_logs',
      'ot_bookings',
      'staff_rosters',
      'insurance_pre_auths',
      'consumable_items',
      'ward_inventory',
      'consumable_consumption',
      'abdm_records',
      'nhcx_claim_records',
      'lab_orders',
      'lab_results',
      'refresh_tokens',
      'otps',
    ];

    // Add default value to id columns if they don't already have one
    for (const table of tables) {
      try {
        await queryRunner.query(`
          ALTER TABLE "${table}"
          ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()::TEXT;
        `);
      } catch (e: any) {
        // Table might not exist or column might already have a default
        // Continue to next table
        if (!e.message.includes('does not exist') && !e.message.includes('already has a default')) {
          console.log(`Warning: Could not alter ${table}: ${e.message}`);
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get all tables with an 'id' column
    const tables = [
      'facilities',
      'users',
      'facility_settings',
      'patients',
      'patient_consents',
      'visits',
      'patient_admissions',
      'discharge_summaries',
      'ward_rounds',
      'ward_round_stops',
      'vitals',
      'triage',
      'mar',
      'consultations',
      'prescriptions',
      'prescription_items',
      'icd10',
      'dispense_records',
      'pharmacy_inventory',
      'equipment',
      'equipment_leases',
      'maintenance_logs',
      'bills',
      'bill_items',
      'payment_transactions',
      'nhcx_claims',
      'notification_logs',
      'notification_templates',
      'follow_ups',
      'patient_segments',
      'crm_campaigns',
      'audit_logs',
      'rooms',
      'beds',
      'housekeeping_logs',
      'ot_bookings',
      'staff_rosters',
      'insurance_pre_auths',
      'consumable_items',
      'ward_inventory',
      'consumable_consumption',
      'abdm_records',
      'nhcx_claim_records',
      'lab_orders',
      'lab_results',
      'refresh_tokens',
      'otps',
    ];

    for (const table of tables) {
      try {
        await queryRunner.query(`
          ALTER TABLE "${table}"
          ALTER COLUMN "id" DROP DEFAULT;
        `);
      } catch (e) {
        // Table might not exist, continue to next table
      }
    }
  }
}
