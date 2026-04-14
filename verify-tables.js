const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'admin',
  database: 'smartopd',
});

pool.query(
  `SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'`,
  (err, result) => {
    if (err) {
      console.error('❌ Error:', err.message);
      process.exit(1);
    } else {
      const count = result.rows[0].table_count;
      console.log(`✅ Total tables in smartopd database: ${count}`);
      if (count >= 47) {
        console.log('✅ All 47+ tables have been created successfully!');
      } else {
        console.log(`⚠️  Expected 47+ tables, but found ${count}`);
      }
      pool.end();
    }
  }
);
