# SmartOPD Test Implementation Tracker

**Updated:** 2026-04-14  
**Current Status:** Phase 0 (Planning) → Phase 1 (Starting)

---

## Phase 1: Staged OPD Journeys (Weeks 1-2)

| Test Case | Test Name | File | Status | Completion | Issues |
|-----------|-----------|------|--------|------------|--------|
| TC-E2E-001 | Returning OPD patient via face recognition | test/e2e/16-staged-opd.e2e-spec.ts | 🟡 Implemented | 2026-04-14 | Running tests to identify missing endpoints |
| TC-E2E-002 | Returning OPD patient via OTP fallback | test/e2e/16-staged-opd.e2e-spec.ts | 🟡 Implemented | 2026-04-14 | Running tests to identify missing endpoints |
| TC-E2E-003 | New patient registration with consent | test/e2e/16-staged-opd.e2e-spec.ts | 🟡 Implemented | 2026-04-14 | Running tests to identify missing endpoints |
| TC-E2E-004 | Doctor consultation to pharmacy handoff | test/e2e/16-staged-opd.e2e-spec.ts | 🟡 Implemented | 2026-04-14 | Running tests to identify missing endpoints |
| TC-E2E-005 | Pharmacy pickup by patient face/OTP verification | test/e2e/16-staged-opd.e2e-spec.ts | 🟡 Implemented | 2026-04-14 | Running tests to identify missing endpoints |
| TC-E2E-006 | Family pickup OTP workflow | test/e2e/16-staged-opd.e2e-spec.ts | 🟡 Implemented | 2026-04-14 | Running tests to identify missing endpoints |
| TC-E2E-007 | Allergy/interactions blocking path | test/e2e/16-staged-opd.e2e-spec.ts | ⏳ Placeholder | - | Ready for implementation |
| TC-E2E-008 | Consultation triggers NHCX claim | test/e2e/16-staged-opd.e2e-spec.ts | ⏳ Placeholder | - | Ready for implementation |
| TC-E2E-009 | Post-visit CRM automation | test/e2e/16-staged-opd.e2e-spec.ts | ⏳ Placeholder | - | Ready for implementation |
| TC-E2E-010 | Consultation-triggered equipment lease | test/e2e/16-staged-opd.e2e-spec.ts | ⏳ Placeholder | - | Ready for implementation |
| TC-E2E-011 | Lab order routing | test/e2e/16-staged-opd.e2e-spec.ts | ⏳ Placeholder | - | Ready for implementation |
| TC-E2E-012 | Visit cancel / abort / recovery | test/e2e/16-staged-opd.e2e-spec.ts | ⏳ Placeholder | - | Ready for implementation |

**Phase 1 Progress:** 6/12 tests implemented (50%) | 0/12 tests passing (0%)  
**Target Completion:** End of Week 2  
**Status:** ⏳ Not Started

---

## Phase 2: Inpatient Hospital Workflows (Weeks 3-4)

| Test Case | Test Name | File | Status | Completion | Issues |
|-----------|-----------|------|--------|------------|--------|
| TC-IPD-001 | Admission from OPD | test/e2e/17-inpatient.e2e-spec.ts | ⏳ Not Started | - | - |
| TC-IPD-002 | Admission from emergency path | test/e2e/17-inpatient.e2e-spec.ts | ⏳ Not Started | - | - |
| TC-IPD-003 | Transfer between beds/rooms | test/e2e/17-inpatient.e2e-spec.ts | ⏳ Not Started | - | - |
| TC-IPD-004 | Discharge and bed turnaround | test/e2e/17-inpatient.e2e-spec.ts | ⏳ Not Started | - | - |
| TC-IPD-005 | Bedside medication via QR wristband | test/e2e/17-inpatient.e2e-spec.ts | ⏳ Not Started | - | - |
| TC-IPD-006 | Ward round stop entry | test/e2e/17-inpatient.e2e-spec.ts | ⏳ Not Started | - | - |
| TC-IPD-007 | OT booking with pre-op checklist block | test/e2e/17-inpatient.e2e-spec.ts | ⏳ Not Started | - | - |
| TC-IPD-008 | OT with post-op bed reservation | test/e2e/17-inpatient.e2e-spec.ts | ⏳ Not Started | - | - |
| TC-IPD-009 | OT cancellation / postponement analytics integrity | test/e2e/17-inpatient.e2e-spec.ts | ⏳ Not Started | - | - |
| TC-IPD-010 | Admission-triggered insurance pre-auth | test/e2e/17-inpatient.e2e-spec.ts | ⏳ Not Started | - | - |

**Phase 2 Progress:** 0/10 tests (0%)  
**Target Completion:** End of Week 4  
**Status:** ⏳ Blocked (waiting for Phase 1)

---

## Phase 3: Revenue & Security (Weeks 5-6)

### Revenue Tests (TC-REV-*)

| Test Case | Test Name | File | Status | Completion | Issues |
|-----------|-----------|------|--------|------------|--------|
| TC-REV-001 | Bill with mixed payment modes | test/e2e/18-revenue.e2e-spec.ts | ⏳ Not Started | - | - |
| TC-REV-002 | Discount application authority | test/e2e/18-revenue.e2e-spec.ts | ⏳ Not Started | - | - |
| TC-REV-003 | NHCX coverage check to approval | test/e2e/18-revenue.e2e-spec.ts | ⏳ Not Started | - | - |
| TC-REV-004 | DHIS incentive recording | test/e2e/18-revenue.e2e-spec.ts | ⏳ Not Started | - | - |
| TC-REV-005 | Equipment lease revenue accounting | test/e2e/18-revenue.e2e-spec.ts | ⏳ Not Started | - | - |

**Revenue Tests Progress:** 0/5 (0%)

### Security Tests (TC-SEC-*)

| Test Case | Test Name | File | Status | Completion | Issues |
|-----------|-----------|------|--------|------------|--------|
| TC-SEC-001 | Database-level RLS enforcement | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-002 | Refresh token never plaintext | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-003 | Old refresh token reuse blocked | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-004 | Login rate limit | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-005 | OTP send rate limit | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-006 | Global rate limit | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-007 | HTTPS-only and redirect | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-008 | CORS allowlist enforcement | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-009 | Helmet security headers | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-010 | Raw biometric photo never persisted | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-011 | Embeddings encrypted at rest | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-012 | ABHA numbers encrypted at rest | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-013 | Biometric deletion SLA | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-014 | Processor agreement gate | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-015 | Quarterly incident-response drill | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-016 | ABDM credentials backend-only | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-017 | Audit completeness across all write operations | test/security/security.spec.ts | ⏳ Not Started | - | - |
| TC-SEC-018 | Audit retention policy (7-year ILM) | test/security/security.spec.ts | ⏳ Not Started | - | - |

**Security Tests Progress:** 0/18 (0%)  
**Phase 3 Total Progress:** 0/23 tests (0%)  
**Target Completion:** End of Week 6  
**Status:** ⏳ Blocked (waiting for Phase 1-2)

---

## Phase 4: ABDM/FHIR/NHCX Contracts (Weeks 7-8)

### ABDM Contracts (TC-ABDM-*)

| Test Case | Test Name | File | Status | Completion | Issues |
|-----------|-----------|------|--------|------------|--------|
| TC-ABDM-001 | M1 ABHA initiation contract | test/contracts/abdm-pact.spec.ts | ⏳ Not Started | - | - |
| TC-ABDM-002 | OTP verify contract | test/contracts/abdm-pact.spec.ts | ⏳ Not Started | - | - |
| TC-ABDM-003 | ABHA address creation contract | test/contracts/abdm-pact.spec.ts | ⏳ Not Started | - | - |
| TC-ABDM-004 | ABHA verification contract | test/contracts/abdm-pact.spec.ts | ⏳ Not Started | - | - |
| TC-ABDM-005 | Care-context linking initiation contract | test/contracts/abdm-pact.spec.ts | ⏳ Not Started | - | - |
| TC-ABDM-006 | Care-context linking confirmation contract | test/contracts/abdm-pact.spec.ts | ⏳ Not Started | - | - |
| TC-ABDM-007 | Consent request contract | test/contracts/abdm-pact.spec.ts | ⏳ Not Started | - | - |
| TC-ABDM-008 | Consent notification callback contract | test/contracts/abdm-pact.spec.ts | ⏳ Not Started | - | - |
| TC-ABDM-009 | Health-information fetch contract | test/contracts/abdm-pact.spec.ts | ⏳ Not Started | - | - |
| TC-ABDM-010 | ABDM token cache refresh behavior | test/contracts/abdm-pact.spec.ts | ⏳ Not Started | - | - |

**ABDM Contracts Progress:** 0/10 (0%)

### FHIR Validation (TC-FHIR-*)

| Test Case | Test Name | File | Status | Completion | Issues |
|-----------|-----------|------|--------|------------|--------|
| TC-FHIR-001 | Every outbound FHIR bundle validates | test/fhir/fhir-validation.spec.ts | ⏳ Not Started | - | - |
| TC-FHIR-002 | Consultation bundle validation | test/fhir/fhir-validation.spec.ts | ⏳ Not Started | - | - |
| TC-FHIR-003 | MedicationRequest bundle validation | test/fhir/fhir-validation.spec.ts | ⏳ Not Started | - | - |
| TC-FHIR-004 | Claim-related bundle validation | test/fhir/fhir-validation.spec.ts | ⏳ Not Started | - | - |
| TC-FHIR-005 | Discharge / inpatient bundle validation | test/fhir/fhir-validation.spec.ts | ⏳ Not Started | - | - |

**FHIR Validation Progress:** 0/5 (0%)

### NHCX Contracts (TC-NHCX-*)

| Test Case | Test Name | File | Status | Completion | Issues |
|-----------|-----------|------|--------|------------|--------|
| TC-NHCX-001 | CoverageEligibilityRequest contract | test/contracts/nhcx-pact.spec.ts | ⏳ Not Started | - | - |
| TC-NHCX-002 | Claim submit contract | test/contracts/nhcx-pact.spec.ts | ⏳ Not Started | - | - |
| TC-NHCX-003 | Claim status callback contract | test/contracts/nhcx-pact.spec.ts | ⏳ Not Started | - | - |
| TC-NHCX-004 | Partial approval mapping | test/contracts/nhcx-pact.spec.ts | ⏳ Not Started | - | - |
| TC-NHCX-005 | Rejection / denial mapping | test/contracts/nhcx-pact.spec.ts | ⏳ Not Started | - | - |
| TC-NHCX-006 | Unknown callback handling without corruption | test/contracts/nhcx-pact.spec.ts | ⏳ Not Started | - | - |

**NHCX Contracts Progress:** 0/6 (0%)  
**Phase 4 Total Progress:** 0/21 tests (0%)  
**Target Completion:** End of Week 8  
**Status:** ⏳ Blocked (waiting for Phase 1-3)

---

## Phase 5: Performance, Load, Stress, Soak, Failover (Weeks 9-10)

### Load Tests (TC-LOAD-*)

| Test Case | SLA Target | File | Status | Baseline | Issues |
|-----------|-----------|------|--------|----------|--------|
| TC-LOAD-001 | p95 <300ms (100 CU) | test/load/standard-api.load.js | ⏳ Not Started | - | - |
| TC-LOAD-002 | Queue responsive (500 CU) | test/load/queue-peak.load.js | ⏳ Not Started | - | - |
| TC-LOAD-003 | Vitals save peak (200-500 CU) | test/load/vitals-peak.load.js | ⏳ Not Started | - | - |
| TC-LOAD-004 | Face match <800ms (50k corpus) | test/load/face-match.load.js | ⏳ Not Started | - | - |
| TC-LOAD-005 | Consultation sign-off <500ms | test/load/consultation-signoff.load.js | ⏳ Not Started | - | - |
| TC-LOAD-006 | ABDM M3 fetch p95 <5s | test/load/abdm-fetch.load.js | ⏳ Not Started | - | - |
| TC-LOAD-007 | Occupancy board <50ms | test/load/occupancy-board.load.js | ⏳ Not Started | - | - |
| TC-LOAD-008 | Admission creation <1s | test/load/admission-creation.load.js | ⏳ Not Started | - | - |
| TC-LOAD-009 | Ward-round stop <500ms | test/load/wardround-stop.load.js | ⏳ Not Started | - | - |

**Load Tests Progress:** 0/9 (0%)

### Stress Tests (TC-STRESS-*)

| Test Case | File | Status | Completion | Issues |
|-----------|------|--------|------------|--------|
| TC-STRESS-001 | 2× peak OPD load | test/stress/2x-peak-opd.stress.js | ⏳ Not Started | - |
| TC-STRESS-002 | 3× OTP/login burst | test/stress/3x-auth-burst.stress.js | ⏳ Not Started | - |
| TC-STRESS-003 | Face-match storm | test/stress/face-match-storm.stress.js | ⏳ Not Started | - |
| TC-STRESS-004 | Claim & FHIR queue flood | test/stress/queue-flood.stress.js | ⏳ Not Started | - |
| TC-STRESS-005 | Report/dashboard spike | test/stress/report-spike.stress.js | ⏳ Not Started | - |

**Stress Tests Progress:** 0/5 (0%)

### Soak Tests (TC-SOAK-*)

| Test Case | Duration | File | Status | Completion | Issues |
|-----------|----------|------|--------|------------|--------|
| TC-SOAK-001 | 12 hours | test/soak/clinic-day.soak.js | ⏳ Not Started | - | - |
| TC-SOAK-002 | 24 hours | test/soak/hospital-workload.soak.js | ⏳ Not Started | - | - |
| TC-SOAK-003 | 24 hours | test/soak/notification-campaign.soak.js | ⏳ Not Started | - | - |

**Soak Tests Progress:** 0/3 (0%)

### Resilience Tests (TC-RES-*)

| Test Case | File | Status | Completion | Issues |
|-----------|------|--------|------------|--------|
| TC-RES-001 | Redis unavailable | test/resilience/redis-failure.spec.ts | ⏳ Not Started | - |
| TC-RES-002 | Postgres failover | test/resilience/postgres-failover.spec.ts | ⏳ Not Started | - |
| TC-RES-003 | Worker restart idempotency | test/resilience/worker-restart.spec.ts | ⏳ Not Started | - |
| TC-RES-004 | Auto-scaling 0→10 ECS | test/resilience/autoscaling.spec.ts | ⏳ Not Started | - |
| TC-RES-005 | PgBouncer pool exhaustion | test/resilience/pgbouncer-pool.spec.ts | ⏳ Not Started | - |

**Resilience Tests Progress:** 0/5 (0%)  
**Phase 5 Total Progress:** 0/22 tests (0%)  
**Target Completion:** End of Week 10  
**Status:** ⏳ Blocked (waiting for Phase 1-4)

---

## Phase 6: Mobile/Offline & UI (Weeks 11-12)

| Test Case | Type | File | Status | Completion | Issues |
|-----------|------|------|--------|------------|--------|
| TC-UI-001 | Playwright | test/ui/receptionist-journey.spec.ts | ⏳ Not Started | - | - |
| TC-UI-002 | Playwright | test/ui/nurse-journey.spec.ts | ⏳ Not Started | - | - |
| TC-UI-003 | Playwright | test/ui/doctor-journey.spec.ts | ⏳ Not Started | - | - |
| TC-UI-004 | Playwright | test/ui/pharmacist-journey.spec.ts | ⏳ Not Started | - | - |
| TC-UI-005 | Playwright | test/ui/admin-journey.spec.ts | ⏳ Not Started | - | - |
| TC-UI-006 | Espresso | test/android/kiosk-journey.spec.ts | ⏳ Not Started | - | - |
| TC-UI-007 | Compose | test/android/vitals-entry.spec.ts | ⏳ Not Started | - | - |
| TC-UI-008 | Compose | test/android/mar-flow.spec.ts | ⏳ Not Started | - | - |
| TC-UI-009 | Compose | test/android/prescription-flow.spec.ts | ⏳ Not Started | - | - |
| TC-OFF-001 | Offline | test/offline/vitals-sync.spec.ts | ⏳ Not Started | - | - |
| TC-OFF-002 | Offline | test/offline/prescription-sync.spec.ts | ⏳ Not Started | - | - |
| TC-OFF-003 | Offline | test/offline/conflict-resolution.spec.ts | ⏳ Not Started | - | - |
| TC-LIVE-001 | WebSocket | test/live/occupancy-board.spec.ts | ⏳ Not Started | - | - |

**Phase 6 Progress:** 0/13 tests (0%)  
**Target Completion:** End of Week 12  
**Status:** ⏳ Blocked (waiting for Phase 1-5)

---

## Phase 7: Endpoint Module Coverage (Weeks 13-14)

| Module | Endpoints | File | Status | Coverage | Issues |
|--------|-----------|------|--------|----------|--------|
| patients | search, by-id, update, merge, consent-revoke | test/integration/patients-endpoints.spec.ts | ⏳ Not Started | - | - |
| abdm | 12 endpoints (ABHA, consent, health-info) | test/integration/abdm-endpoints.spec.ts | ⏳ Not Started | - | - |
| payment | 6 endpoints (claim, status, DHIS, analytics) | test/integration/payment-endpoints.spec.ts | ⏳ Not Started | - | - |
| crm | 7 endpoints (profile, scoring, campaigns) | test/integration/crm-endpoints.spec.ts | ⏳ Not Started | - | - |
| audit | 5 endpoints (export, manual-log, retention) | test/integration/audit-endpoints.spec.ts | ⏳ Not Started | - | - |
| operations-crm | 6 endpoints (occupancy, rostering, P&L) | test/integration/ops-crm-endpoints.spec.ts | ⏳ Not Started | - | - |

**Phase 7 Progress:** 0/6 module groups (0%)  
**Target Completion:** End of Week 14  
**Status:** ⏳ Blocked (waiting for Phase 1-6)

---

## Summary Progress Dashboard

```
╔═════════════════════════════════════════════════════════════════════╗
║                  SmartOPD Test Maturity Progress                    ║
╠═════════════════════════════════════════════════════════════════════╣
║ Phase 1: OPD Journeys              6/12   (50%) 🟡 IN PROGRESS      ║
║ Phase 2: Inpatient Workflows       0/10   (0%)  ⏳ Not Started      ║
║ Phase 3: Revenue & Security        0/23   (0%)  ⏳ Not Started      ║
║ Phase 4: Contracts & Compliance    0/21   (0%)  ⏳ Not Started      ║
║ Phase 5: Performance & Resilience  0/22   (0%)  ⏳ Not Started      ║
║ Phase 6: Mobile/Offline & UI       0/13   (0%)  ⏳ Not Started      ║
║ Phase 7: Endpoint Coverage         0/50+  (0%)  ⏳ Not Started      ║
╠═════════════════════════════════════════════════════════════════════╣
║ TOTAL PROGRESS                    6/151+ (4%)  🟡 WEEK 1 STARTED    ║
╠═════════════════════════════════════════════════════════════════════╣
║ Current Date: 2026-04-14                                            ║
║ Phase 1 Target: Week 2 (2026-04-28)                                ║
║ Phase 2 Target: Week 4 (2026-05-12)                                ║
║ Phase 3 Target: Week 6 (2026-05-26)                                ║
║ Phase 4 Target: Week 8 (2026-06-09)                                ║
║ Phase 5 Target: Week 10 (2026-06-23)                               ║
║ Phase 6 Target: Week 12 (2026-07-07)                               ║
║ Phase 7 Target: Week 14 (2026-07-21)                               ║
║ GO-LIVE READY: 2026-07-28 (if all phases passing)                  ║
╚═════════════════════════════════════════════════════════════════════╝
```

---

## Key Milestones

| Milestone | Target Date | Status | Notes |
|-----------|-------------|--------|-------|
| Phase 1 Complete (OPD) | 2026-04-28 | ⏳ Not Started | 12 tests, audit trails |
| Phase 2 Complete (IPD) | 2026-05-12 | ⏳ Not Started | 10 tests, bed management |
| Phase 3 Complete (Revenue + Security) | 2026-05-26 | ⏳ Not Started | 23 tests, RLS + encryption |
| Phase 4 Complete (Contracts) | 2026-06-09 | ⏳ Not Started | 21 tests, ABDM/NHCX cert |
| Phase 5 Complete (Performance) | 2026-06-23 | ⏳ Not Started | 22 tests, SLA targets |
| Phase 6 Complete (Mobile/UI) | 2026-07-07 | ⏳ Not Started | 13 tests, offline + E2E |
| Phase 7 Complete (Endpoints) | 2026-07-21 | ⏳ Not Started | 95%+ coverage |
| **GO-LIVE GATE PASSED** | **2026-07-28** | 🛑 Blocked | Ready for production |

---

## Status Legend

- ✅ Complete
- 🟡 In Progress
- ⏳ Not Started
- 🛑 Blocked
- ⚠️ At Risk

---

## Notes & Issues Tracking

### Critical Blockers

- [ ] None currently identified; planning phase in progress

### At-Risk Items

- [ ] None currently identified

### Dependencies to Verify

- [ ] All modules exist in src/ (verified: 24/24 modules present)
- [ ] Test fixtures library available (to be created)
- [ ] Jest E2E infrastructure ready (to verify)
- [ ] Staging DB connectivity (to verify)

---

## Instructions for Use

1. **Weekly:** Update status (✅, 🟡, ⏳) for each test case
2. **Per Test:** Document completion date and any issues encountered
3. **Per Phase:** Sum total and update overall progress
4. **Escalation:** If blocked, move to "Critical Blockers" section immediately

---

**Last Updated:** 2026-04-14  
**Next Review:** 2026-04-21 (after Phase 1 kickoff)  
**Owner:** [Engineering Lead]
