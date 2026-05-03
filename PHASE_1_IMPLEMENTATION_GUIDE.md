# Phase 1 Implementation Guide — OPD Staged Journeys

**Status:** 🟡 In Progress (Test file created, runtime verification pending)  
**Created:** 2026-04-14  
**Target Completion:** End of Week 2 (2026-04-28)

---

## What Was Just Completed

✅ **Created:** `test/e2e/16-staged-opd.e2e-spec.ts` (480+ lines)  
- Structured test file with 12 OPD journey test cases
- Shared context initialization (avoids multiple app startups)
- 6 fully implemented test cases (TC-E2E-001 through TC-E2E-006)
- 6 placeholder test cases (TC-E2E-007 through TC-E2E-012) ready for implementation
- Custom Jest matchers for flexible HTTP status checks

---

## Test Cases Implemented (6/12)

### ✅ TC-E2E-001: Face Recognition Journey
**Status:** Implementation complete, runtime testing in progress

### ✅ TC-E2E-002: OTP Fallback Path
**Status:** Implementation complete, runtime testing in progress

### ✅ TC-E2E-003: Consent & Face Enrollment
**Status:** Implementation complete, runtime testing in progress

### ✅ TC-E2E-004: Doctor-Pharmacy Handoff
**Status:** Implementation complete, runtime testing in progress

### ✅ TC-E2E-005: Pharmacy Face/OTP Pickup
**Status:** Implementation complete, runtime testing in progress

### ✅ TC-E2E-006: Family Member Pickup
**Status:** Implementation complete, runtime testing in progress

---

## Implementation Roadmap

**This Week (Week 1-2):**
1. ✅ Create test infrastructure & base tests (DONE)
2. 🔄 Run tests, identify missing endpoints
3. Implement missing endpoints per test requirements
4. Complete remaining 6 test cases (TC-E2E-007 to TC-E2E-012)
5. Verify all 12 tests passing

**Next Week (Week 3-4):**
- Begin Phase 2 (Inpatient Hospital Workflows)

---

## Next Action: Test Execution & Verification

Run tests to identify missing endpoints:
```bash
npm run test:e2e -- test/e2e/16-staged-opd.e2e-spec.ts
```

Expected output: See which endpoints are missing (404s) or fail assertions.

---

**Document Link:** [TEST_MATURITY_PLAN.md](TEST_MATURITY_PLAN.md) for full roadmap  
**Tracker Link:** [TEST_IMPLEMENTATION_TRACKER.md](TEST_IMPLEMENTATION_TRACKER.md) for progress
