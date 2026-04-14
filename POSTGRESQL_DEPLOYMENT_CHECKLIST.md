# PostgreSQL Migration - Deployment Checklist

## ✅ IMPLEMENTATION COMPLETE

All code changes are done. Below is the execution checklist.

---

## Phase 1: Pre-Deployment Setup (1-2 hours)

### PostgreSQL Instance
- [ ] PostgreSQL 12+ installed/available
- [ ] Empty database created named `smartopd`
- [ ] User/password configured
- [ ] Network access verified (if remote)

**Command to verify:**
```bash
psql -h your_host -U your_user -d smartopd -c "SELECT 1"
# Should return: 1
```

### Backup Current System (CRITICAL if production)
- [ ] MySQL database backed up
  ```bash
  mysqldump -u user -p database_name > backup_$(date +%Y%m%d).sql
  ```
- [ ] Backup stored safely
- [ ] Backup verified (can be restored if needed)

### Environment Configuration
- [ ] `.env` file updated with PostgreSQL details:
  ```env
  DB_HOST=your_postgresql_host
  DB_PORT=5432
  DB_USERNAME=postgres
  DB_PASSWORD=your_password
  DB_NAME=smartopd
  NODE_ENV=production
  ```
- [ ] Test .env configuration is correct
- [ ] All other .env variables preserved

---

## Phase 2: Application Deployment (30 minutes)

### Step 1: Install Dependencies
- [ ] Remove node_modules (optional but recommended)
  ```bash
  rm -rf node_modules
  npm ci  # or npm install
  ```
- [ ] Verify pg driver installed: `npm ls pg`

### Step 2: Build Application
- [ ] Run build command
  ```bash
  npm run build
  ```
- [ ] Check for compilation errors
- [ ] Verify dist folder created with migrations:
  ```bash
  ls -la dist/src/migrations/
  # Should show: 1704067200001-MigrateToPostgreSQL.js
  ```

### Step 3: Start Application
- [ ] Start application in foreground (for monitoring)
  ```bash
  npm start
  ```
- [ ] Watch logs for migration execution
- [ ] Look for: "Migration executed successfully"
- [ ] Check for any ERROR messages

**Expected log output:**
```
[Nest] 12345  - 04/13/2026, 12:34:56 AM   [TypeOrmModule]
Successfully connected to the database.
Starting Nest application...
Nest application successfully started on port 3000

[Database] Migrations
  ✔ CreateEquipmentIndices1704067200000
  ✔ MigrateToPostgreSQL1704067200001
```

---

## Phase 3: Post-Deployment Verification (30 minutes)

### Database Schema Verification
- [ ] Connect to PostgreSQL database
  ```bash
  psql -h your_host -U your_user -d smartopd
  ```

- [ ] Verify all 47 tables created
  ```sql
  SELECT COUNT(*) as table_count FROM information_schema.tables 
  WHERE table_schema = 'public';
  -- Should return: 47
  ```

- [ ] Verify ENUM types created
  ```sql
  SELECT COUNT(*) as enum_count FROM pg_type WHERE typtype = 'e';
  -- Should return: 38
  ```

- [ ] Check migrations metadata
  ```sql
  SELECT name, timestamp FROM "typeorm_metadata" 
  WHERE type = 'migration' 
  ORDER BY timestamp DESC;
  -- Should show both migrations applied
  ```

- [ ] Spot-check critical tables exist
  ```sql
  \dt users
  \dt patients
  \dt visits
  \dt bills
  -- All should show [relation found]
  ```

### API Connectivity Verification
- [ ] Application logs show "application successfully started"
- [ ] No error messages in logs
- [ ] Application responding to health check:
  ```bash
  curl http://localhost:3000/health
  # Should return: HTTP 200
  ```

### Test Suite Verification (optional but recommended)
- [ ] Run unit tests
  ```bash
  npm test
  # All tests should pass (database-agnostic)
  ```

- [ ] Run E2E tests (if PostgreSQL test DB configured)
  ```bash
  npm run test:e2e
  # Should see: "Tests: X passed, X total"
  # Expected: ≥ 560 passed
  ```

---

## Phase 4: Data Migration (if coming from MySQL)

### Option A: Skip (Fresh Database)
- [ ] Database is new/empty → Continue to Phase 5

### Option B: Migrate Existing Data
- [ ] Dump MySQL data (no schema)
  ```bash
  mysqldump -u user -p smartopd --no-create-info --complete-insert > data.sql
  ```

- [ ] Convert SQL to PostgreSQL (remove backticks, etc.)
  ```bash
  sed "s/\`//g" data.sql > data_converted.sql
  ```

- [ ] Import into PostgreSQL
  ```bash
  psql -h your_host -U postgres -d smartopd -f data_converted.sql
  ```

- [ ] Verify data integrity
  ```sql
  SELECT COUNT(*) FROM patients;
  SELECT COUNT(*) FROM visits;
  SELECT COUNT(*) FROM bills;
  -- Compare with original MySQL counts
  ```

---

## Phase 5: Monitoring & Validation

### Logs Monitoring
- [ ] Monitor application logs for 1-2 hours
- [ ] Watch for any ERROR or WARN messages
- [ ] Check database connectivity logs
- [ ] Verify migrations logged as successful

### API Endpoint Testing
- [ ] Login endpoint works
  ```bash
  curl -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"password"}'
  ```

- [ ] Patient retrieval works
  ```bash
  curl http://localhost:3000/api/v1/patients \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```

- [ ] Test a few key endpoints
  ```bash
  # Visits endpoint
  curl http://localhost:3000/api/v1/visits \
    -H "Authorization: Bearer YOUR_TOKEN"

  # Bills endpoint
  curl http://localhost:3000/api/v1/bills \
    -H "Authorization: Bearer YOUR_TOKEN"
  ```

### Database Performance Check
- [ ] Run sample queries to verify performance
  ```sql
  -- Check table sizes
  SELECT schemaname, tablename, 
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

  -- Check index usage
  SELECT * FROM pg_stat_user_indexes;
  ```

---

## Phase 6: Cutover (if switching from MySQL)

### Pre-Cutover
- [ ] All verification tests passed
- [ ] E2E tests passing (or 95%+ passing)
- [ ] No ERROR messages in logs
- [ ] Database query performance acceptable

### Cutover
- [ ] Announce downtime window to users
- [ ] Stop application (if any still running on MySQL)
- [ ] Update DNS/load balancer to PostgreSQL instance
- [ ] Start application on PostgreSQL
- [ ] Monitor logs intensively for 30 minutes
- [ ] Verify all user-facing features working
- [ ] Announce cutover complete

### Post-Cutover
- [ ] Keep MySQL instance running for 24 hours (just in case)
- [ ] Monitor application performance metrics
- [ ] Check database connectivity metrics
- [ ] Verify data consistency spot-checks
- [ ] Keep backup on hand for 7 days

---

## Rollback Procedure (If Needed)

### Immediate Rollback (< 1 hour from cutover)
1. Stop PostgreSQL-based application
2. Update configuration back to MySQL
   ```env
   DB_HOST=old_mysql_host
   DB_PORT=3306
   DB_USERNAME=root
   DB_PASSWORD=original_password
   ```
3. Restart application
4. Verify all systems operational
5. Investigate PostgreSQL issue

### Data Rollback (if data corrupted)
1. Restore MySQL backup
   ```bash
   mysql -u root -p smartopd < backup_YYYYMMDD.sql
   ```
2. Verify data integrity
3. Restart application
4. Resume operations

---

## Troubleshooting Checklist

### Issue: "Connection refused"
- [ ] PostgreSQL service running: `systemctl status postgresql`
- [ ] Port 5432 accessible: `nc -zv localhost 5432`
- [ ] Credentials correct in .env
- [ ] User has connect privilege
  ```sql
  GRANT CONNECT ON DATABASE smartopd TO your_user;
  ```

### Issue: "ENUM type already exists"
- [ ] Normal message (CREATE TYPE IF NOT EXISTS)
- [ ] Migration should still succeed
- [ ] Continue with verification

### Issue: "Migration failed"
- [ ] Check logs for specific error
- [ ] Verify PostgreSQL is running
- [ ] Check disk space: `df -h`
- [ ] Run manually: `npm run typeorm migration:run`

### Issue: "Tests failing"
- [ ] Check if tests can connect to PostgreSQL
- [ ] Verify test database exists
- [ ] Check database user permissions
- [ ] Run specific test: `npm test -- --testPathPattern=auth`

### Issue: "Application slow"
- [ ] Check indices created: `\di` in psql
- [ ] Analyze tables: `ANALYZE;` in PostgreSQL
- [ ] Check query plans: `EXPLAIN ANALYZE SELECT...`
- [ ] Monitor with: `SELECT * FROM pg_stat_activity`

---

## Success Criteria

✅ Migration is complete when:
- [ ] All 47 tables visible in PostgreSQL
- [ ] Application starts without errors
- [ ] Migrations listed as applied
- [ ] API endpoints responding
- [ ] Test suite passing or mostly passing
- [ ] No ERROR messages in logs
- [ ] Database queries performant
- [ ] Backup of MySQL still available

---

## Rollback Readiness

Keep ready for rollback:
- [ ] MySQL backup file
- [ ] Original .env file
- [ ] Original package.json (with mysql2)
- [ ] Original app.module.ts config
- [ ] PostgreSQL admin credentials
- [ ] Network admin contact (for DNS changes)

---

## Timeline Estimate

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Pre-deployment setup | 1-2 hrs | 📋 Manual |
| 2 | Application deployment | 30 min | 📋 Manual |
| 3 | Verification | 30 min | 📋 Manual |
| 4 | Data migration | 1-4 hrs | 📋 Manual (if needed) |
| 5 | Monitoring | 2 hrs | 📋 Manual |
| 6 | Cutover | 1 hr | 📋 Manual |
| **TOTAL** | | **5-10 hours** | |

---

## Support Resources

If you encounter issues:

1. **Check Logs First**
   ```bash
   npm start 2>&1 | tee migration.log
   # Save output for debugging
   ```

2. **PostgreSQL Documentation**
   - https://www.postgresql.org/docs/current/
   - TypeORM PostgreSQL: https://typeorm.io/data-source-options#postgres-data-source-options

3. **Migration File Location**
   - Source: `src/migrations/1704067200001-MigrateToPostgreSQL.ts`
   - Compiled: `dist/src/migrations/1704067200001-MigrateToPostgreSQL.js`

4. **Verify Installation**
   ```bash
   psql --version           # Check PostgreSQL CLI
   npm ls pg               # Verify pg driver installed
   npm ls typeorm          # Verify TypeORM installed
   ```

---

## Sign-Off

- [ ] All preparation complete
- [ ] Backup verified
- [ ] .env configured
- [ ] Ready to begin Phase 1

**Proceed to Phase 1 when ready! 🚀**
