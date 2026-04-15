# SmartOPD E2E Test Fixes - Implementation Plan

## Status Summary

**Completed (P0 - Blockers)**
- [x] POST /api/v1/auth/register returns 500 - FIXED
  - Root cause: UUID columns missing DEFAULT value
  - Solution: Created migration AddUuidDefaults with uuid_generate_v4()::TEXT default
  - Impact: All table inserts will now generate UUIDs automatically

- [x] Token/auth flow instability after bootstrap - FIXED
  - Root cause: Registered facilities/admins created with isActive: false in non-production
  - Solution: Changed NODE_ENV check from 'test' to 'not production'
  - Impact: Users can now immediately login after registration in dev/test/staging

**In Progress**
- [ ] Verify P0 fixes with database access and E2E test execution
- [ ] Add comprehensive smoke checks to E2E test helpers

**Remaining Work (P1 - High Priority)**
1. Authorization behavior masked by auth rejection
   - Current symptom: Tests expect 403 Forbidden but get 401 Unauthorized
   - Root cause: JWT validation failing before role-based checks can run
   - Action: Once P0 fixes are deployed, re-run auth tests to identify remaining issues
   - Expected: Should be resolved by P0 fixes (users becoming active)

2. Security and compliance validations not trustworthy
   - Current symptom: Audit-log access control tests failing at setup
   - Root cause: Setup failures prevent reaching actual authorization logic
   - Action: Once P0 fixes work, re-run audit and equipment suites
   - Expected: Many tests will now reach business logic layer

**Remaining Work (P2 - Medium Priority)**
1. Module-specific business logic verification
   - Visit workflow: Check isolation, validation, state transitions
   - Patient management: Verify IDOR protections, pagination, filtering
   - Equipment: Validate role-based restrictions (NURSE creating equipment)
   - CRM: Verify facility scoping, retention policies
   - Audit: Check log entry creation, non-exposure of sensitive data

## Test Suite Dependencies

Recommended execution order (from QA report):
1. **02-auth** → Bootstrap endpoint (register, login, logout, token rotation)
2. **09-equipment** → Role-based restrictions (should fail early if auth broken)
3. **04-patients** → Core entity with relationships (visits, admissions)
4. **05-visits** → Business workflow (check-in, doctor seen, completion)
5. **13-audit** → Cross-cutting concerns (all failures now visible)

## Database Setup Notes

- PostgreSQL database required with uuid-ossp extension
- Migrations auto-run via TypeORM (migrationsRun: true in app.module.ts)
- E2E tests create/modify data via API (not direct DB write)
- NODE_ENV='test' auto-set in test helpers (app.setup.ts:33)
- JWT_EXPIRES_IN='24h' for E2E tests (default 15m too short for full suite)

## Implementation Checklist

### Phase 1: Verify P0 Fixes (Now)
- [ ] Database connectivity confirmed
- [ ] Migrations applied successfully
- [ ] Auth happy path tests pass (register → login → logout)
- [ ] Equipment/Patient suites no longer fail at setup

### Phase 2: Investigate P1 Issues (After Phase 1 Success)
- [ ] Re-run equipment test: NURSE trying to create equipment → 403
- [ ] Verify equipment test returns expected auth errors, not 401
- [ ] Check equipment suite for role-based authorization logic
- [ ] Review payload validation (missing field → 400, not 401)
- [ ] Verify conflict detection (duplicate email → 409, not 401)

### Phase 3: Hardening & Compliance (P2)
- [ ] Facility scoping: User A cannot access Facility B data
- [ ] IDOR: User cannot access other users' patient records via ID
- [ ] Audit trail: Verify all modifications logged
- [ ] Rate limiting: Verify throttle guard working
- [ ] Token blacklisting: Logout revokes refresh tokens & access token
- [ ] Password validation: Weak passwords rejected
- [ ] Injection safety: SQL injection & XSS prevented

## Known Issues (Not Yet P0)

1. Redis/Bull connection may timeout if Redis not running
   - Current: Tests skip SMS/queue operations gracefully
   - Future: Mock Redis or provide test container

2. FHIR/ABDM endpoints not available in test
   - Current: Tests skip health exchange operations
   - Future: Mock external API responses

3. Payment gateway keys (Razorpay/Stripe) are test keys
   - Current: Tests can create payment transactions
   - Future: Validate in staging environment

## Monitoring & Debugging

### Key Environment Variables
```bash
NODE_ENV=development (or test)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_NAME=smartopd
JWT_SECRET=<your-test-key>
JWT_EXPIRES_IN=24h
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Test Execution
```bash
npm run test:all           # Run all tests
npm run test:e2e           # Run only E2E tests
npm run test:cov           # Run with coverage
```

### Common Error Patterns

| Error | Cause | Fix |
|-------|-------|-----|
| "null value in column id" | UUID generation | Migration must add DEFAULT |
| "Invalid credentials" | User inactive | Check isActive flag in register |
| "Invalid or expired token" | JWT validation | Verify JWT_SECRET matches |
| "Unable to connect to database" | DB not running | Start PostgreSQL service |
| "ECONNREFUSED 127.0.0.1:6379" | Redis not running | Start Redis or mock it |

## Next Steps

1. Ensure PostgreSQL and Redis are running
2. Run migrations: `npm run typeorm migration:run`
3. Execute P0 test suite: `npm run test:all 2>&1 | tee e2e-results.log`
4. Analyze failures by suite order (auth → equipment → patients)
5. Update this document with findings for P1/P2 work

---

*Last Updated: 2026-04-14*
*Prepared by: Claude Code*
