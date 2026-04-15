import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add uuid_generate_v4() DEFAULT to all id columns.
 *
 * The initial migration created id columns as VARCHAR(36) PRIMARY KEY
 * without a DEFAULT. PostgreSQL therefore cannot auto-generate UUIDs,
 * causing INSERT failures when TypeORM sends VALUES (DEFAULT, ...).
 *
 * Each ALTER is wrapped in a PostgreSQL DO block so a missing table or
 * already-existing default never aborts the surrounding transaction.
 */
export class AddUuidDefaults1704067200002 implements MigrationInterface {
  name = 'AddUuidDefaults1704067200002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid-ossp — idempotent, safe to run multiple times
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Table names exactly as created in migration 1
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
      'consultations',
      'prescriptions',
      'prescription_items',
      'vitals',
      'triages',
      'mar',
      'lab_orders',
      'lab_results',
      'rooms',
      'beds',
      'housekeeping_logs',
      'equipment',
      'equipment_leases',
      'maintenance_logs',
      'consumable_items',
      'consumable_consumptions',
      'ward_inventory',
      'ot_bookings',
      'bills',
      'bill_items',
      'payment_transactions',
      'nhcx_claims',
      'insurance_pre_auths',
      'nhcx_claim_records',
      'abdm_records',
      'follow_ups',
      'patient_segments',
      'crm_campaigns',
      'notification_logs',
      'notification_templates',
      'staff_shifts',
      'pharmacy_inventory',
      'dispense_records',
      'audit_logs',
      'otps',
      'refresh_tokens',
    ];

    for (const table of tables) {
      // DO block catches any error (table missing, default already set, etc.)
      // so the outer transaction is never aborted.
      await queryRunner.query(`
        DO $$
        BEGIN
          ALTER TABLE "${table}" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()::TEXT;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'facilities', 'users', 'facility_settings', 'patients', 'patient_consents',
      'visits', 'patient_admissions', 'discharge_summaries', 'ward_rounds',
      'ward_round_stops', 'consultations', 'prescriptions', 'prescription_items',
      'vitals', 'triages', 'mar', 'lab_orders', 'lab_results', 'rooms', 'beds',
      'housekeeping_logs', 'equipment', 'equipment_leases', 'maintenance_logs',
      'consumable_items', 'consumable_consumptions', 'ward_inventory', 'ot_bookings',
      'bills', 'bill_items', 'payment_transactions', 'nhcx_claims', 'insurance_pre_auths',
      'nhcx_claim_records', 'abdm_records', 'follow_ups', 'patient_segments',
      'crm_campaigns', 'notification_logs', 'notification_templates', 'staff_shifts',
      'pharmacy_inventory', 'dispense_records', 'audit_logs', 'otps', 'refresh_tokens',
    ];

    for (const table of tables) {
      await queryRunner.query(`
        DO $$
        BEGIN
          ALTER TABLE "${table}" ALTER COLUMN "id" DROP DEFAULT;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        $$;
      `);
    }
  }
}
