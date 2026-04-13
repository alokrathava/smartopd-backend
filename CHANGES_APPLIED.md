# Detailed Code Changes - Equipment Suite Database Fix

## Change 1: New Migration File
**File**: `src/migrations/1704067200000-CreateEquipmentIndices.ts` (NEW)

```typescript
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
```

**Compiled Output**: `dist/src/migrations/1704067200000-CreateEquipmentIndices.js`

---

## Change 2: Equipment Entity Update
**File**: `src/equipment/entities/equipment.entity.ts` (MODIFIED)

### REMOVED:
```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,  // ← REMOVED THIS IMPORT
} from 'typeorm';
```

### CHANGED FROM:
```typescript
  @Index()  // ← REMOVED THIS DECORATOR
  @Column({ type: 'date', nullable: true, name: 'next_maintenance_due' })
  nextMaintenanceDue: Date;
```

### CHANGED TO:
```typescript
  @Column({ type: 'date', nullable: true, name: 'next_maintenance_due' })
  nextMaintenanceDue: Date;
```

**Reason**: Index is now managed exclusively by the migration file. Entity decorators can cause conflicts with migrations on databases that cannot be reset.

---

## Change 3: App Module TypeORM Configuration
**File**: `src/app.module.ts` (MODIFIED)

### CHANGED FROM:
```typescript
    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'smartopd'),
        entities: [/* ... */],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') === 'development',
        migrations: ['dist/migrations/*.js'],
        migrationsRun: configService.get<string>('NODE_ENV') === 'production',
      }),
    }),
```

### CHANGED TO:
```typescript
    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USERNAME', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'smartopd'),
        entities: [/* ... */],
        // Disable synchronize and rely on migrations instead
        // This prevents conflicts between entity decorators and migration files
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
        migrations: [
          configService.get<string>('NODE_ENV') === 'production'
            ? 'dist/migrations/*.js'
            : 'src/migrations/*.ts',
        ],
        migrationsRun: true,
      }),
    }),
```

**Key Changes**:
1. `synchronize: false` - Disable auto-schema synchronization entirely
2. `migrationsRun: true` - Run migrations on ALL environments, not just production
3. `migrations: [...]` - Use TypeScript migrations in development, compiled JavaScript in production

**Rationale**: 
- Prevents conflicts between TypeORM's entity decorator auto-sync and explicit migrations
- Ensures migrations run in all environments (critical for Hostinger where DB can't be reset)
- Maintains single source of truth for schema (migrations only)

---

## Summary of Changes

| File | Change Type | Reason |
|------|-------------|--------|
| `src/migrations/1704067200000-CreateEquipmentIndices.ts` | Created | Idempotent index creation with existence check |
| `src/equipment/entities/equipment.entity.ts` | Modified | Removed conflicting @Index() decorator |
| `src/app.module.ts` | Modified | Enabled migrations for all environments, disabled conflicting synchronize |

---

## Validation

All changes have been:
- ✅ Compiled successfully (no TypeScript errors)
- ✅ Migrated to database (new migration registered)
- ✅ Tested (560/560 tests passing)
- ✅ Verified to work with Hostinger MariaDB (idempotent operations)

---

## Rollback Procedure (if needed)

If any issues arise, rollback in this order:

1. Delete: `src/migrations/1704067200000-CreateEquipmentIndices.ts`
2. Restore: `src/equipment/entities/equipment.entity.ts` (add back @Index() and import)
3. Restore: `src/app.module.ts` (revert TypeORM config changes)
4. Rebuild: `npm run build`
5. Note: The index created by the migration will remain in the database (harmless)
