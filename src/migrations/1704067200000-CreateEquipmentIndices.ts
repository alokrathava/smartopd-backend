import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEquipmentIndices1704067200000 implements MigrationInterface {
  name = 'CreateEquipmentIndices1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if equipment table exists first
    const tableExists = await this.tableExists(queryRunner, 'equipment');
    if (!tableExists) {
      console.log('Equipment table does not exist yet, skipping index creation');
      return;
    }

    // Check if index exists before creating it
    const indexExists = await this.indexExists(
      queryRunner,
      'equipment',
      'IDX_nextMaintenanceDue',
    );

    if (!indexExists) {
      // Create index safely with IF NOT EXISTS (PostgreSQL syntax)
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS "IDX_nextMaintenanceDue" ON "equipment" ("next_maintenance_due")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index only if it exists (PostgreSQL syntax)
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_nextMaintenanceDue"`,
    );
  }

  // Helper method to check if table exists (PostgreSQL version)
  private async tableExists(
    queryRunner: QueryRunner,
    tableName: string,
  ): Promise<boolean> {
    try {
      const result = await queryRunner.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1`,
        [tableName],
      );
      return result && result.length > 0;
    } catch (error) {
      console.warn(`Error checking if table exists: ${error.message}`);
      return false;
    }
  }

  // Helper method to check if index exists (PostgreSQL version)
  private async indexExists(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<boolean> {
    try {
      const result = await queryRunner.query(
        `SELECT 1 FROM pg_indexes
         WHERE tablename = $1 AND indexname = $2`,
        [tableName, indexName],
      );
      return result && result.length > 0;
    } catch (error) {
      // If query fails, assume index doesn't exist to be safe
      console.warn(`Error checking if index exists: ${error.message}`);
      return false;
    }
  }
}
