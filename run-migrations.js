require('dotenv').config();
const { DataSource } = require('typeorm');
const path = require('path');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'smartopd',
  migrations: ['dist/migrations/*.js'],
  migrationsRun: false, // We'll run them manually
  synchronize: false,
  logging: true,
});

AppDataSource.initialize()
  .then(async () => {
    console.log('✅ Database connection established');
    
    // Get pending migrations
    const pendingMigrations = await AppDataSource.showMigrations();
    console.log('📋 Pending migrations:', pendingMigrations);
    
    // Run migrations
    console.log('🔄 Running migrations...');
    await AppDataSource.runMigrations();
    console.log('✅ Migrations completed successfully!');
    
    // Verify tables
    const queryRunner = AppDataSource.createQueryRunner();
    const tableCount = await queryRunner.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`✅ Total tables created: ${tableCount[0].table_count}`);
    
    await AppDataSource.destroy();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration error:', error);
    process.exit(1);
  });
