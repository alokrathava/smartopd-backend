require('dotenv').config();
const { DataSource } = require('typeorm');
const path = require('path');

const migrationsPath = path.join(__dirname, 'dist/src/migrations/*.js');
console.log('Migrations path:', migrationsPath);

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'smartopd',
  migrations: [migrationsPath],
  migrationsRun: false,
  synchronize: false,
  logging: true,
});

AppDataSource.initialize()
  .then(async () => {
    console.log('✅ Database connection established');
    console.log('Migrations found:', AppDataSource.migrations.length);
    AppDataSource.migrations.forEach(m => {
      console.log('  -', m.name);
    });
    
    // Run migrations
    console.log('🔄 Running migrations...');
    const result = await AppDataSource.runMigrations();
    console.log('✅ Migrations completed:', result.length, 'migrations executed');
    
    // Verify tables
    const queryRunner = AppDataSource.createQueryRunner();
    const tableCount = await queryRunner.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`✅ Total tables created: ${tableCount[0].table_count}`);
    
    // List all tables
    const tables = await queryRunner.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `);
    console.log('✅ Tables:');
    tables.forEach(t => console.log('  -', t.tablename));
    
    await AppDataSource.destroy();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
