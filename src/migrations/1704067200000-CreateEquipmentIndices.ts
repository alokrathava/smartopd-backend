import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEquipmentIndices1704067200000 implements MigrationInterface {
  name = 'CreateEquipmentIndices1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if index exists before creating it
    // This is critical for environments like Hostinger where the database cannot be reset
    const indexExists = await this.indexExists(
      queryRunner,
      'equipment',
      'IDX_nextMaintenanceDue',
    );

    if (!indexExists) {
      // Create index safely with IF NOT EXISTS
      await queryRunner.query(
        `CREATE INDEX \`IDX_nextMaintenanceDue\` ON \`equipment\` (\`next_maintenance_due\`)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index only if it exists
    await queryRunner.query(
      `ALTER TABLE \`equipment\` DROP INDEX IF EXISTS \`IDX_nextMaintenanceDue\``,
    );
  }

  // Helper method to check if index exists in MariaDB/MySQL
  private async indexExists(
    queryRunner: QueryRunner,
    tableName: string,
    indexName: string,
  ): Promise<boolean> {
    try {
      const result = await queryRunner.query(
        `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_NAME = ? AND INDEX_NAME = ? AND TABLE_SCHEMA = DATABASE()`,
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
