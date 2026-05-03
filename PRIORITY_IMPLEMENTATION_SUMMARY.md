# SmartOPD Test Maturity — Priority Implementation Summary

**Date:** 2026-04-14  
**Current State:** 988 tests passing (560 E2E module, 427 unit)  
**Target State:** +500 tests covering staged journeys, security, compliance, performance, mobile/offline  
**Timeline:** 14 weeks (2 weeks per phase)  
**Certification Gate:** All 7 phases passing = go-live eligible

---

## Quick Reference: What's Missing & Why It Matters

| Category | Gap | Business Impact | TRD Requirement | Timeline |
|----------|-----|-----------------|-----------------|----------|
| **True Staged E2E Journeys** | No end-to-end clinical workflows proven | Can't sell as complete system; audit trail breaks at module boundaries | Staging E2E per role required before go-live | Phase 1 (Weeks 1-2) |
| **Inpatient Hospital Flows** | Admission, bed mgt, discharge isolated | Hospital can't operate; patient continuity broken | Full hospital lifecycle required | Phase 2 (Weeks 3-4) |
| **Revenue Proof** | Mixed payments, NHCX, DHIS untested | Can't prove hospital revenue model works; claims unpaid | Revenue flows to DHIS tracking required | Phase 3 (Weeks 5-6) |
| **Security/Compliance** | RLS, encryption, rate limits, audit SLA untested | DPDP violation risk; audit fails; data leakage possible | DB RLS, encryption, 7-year audit, deletion SLA required | Phase 3 (Weeks 5-6) |
| **ABDM/FHIR/NHCX Contracts** | No Pact contract tests, FHIR validation missing | ABDM certification impossible; claim interchange breaks | Contract + FHIR validation + cert readiness required | Phase 4 (Weeks 7-8) |
| **Performance & Resilience** | No load/stress/soak/failover tests | Can't guarantee sub-300ms API response; OPD clinic crashes under peak | p95 <300ms, 50k face match <800ms, auto-scale <2min required | Phase 5 (Weeks 9-10) |
| **Mobile/Offline & UI** | No Playwright per-role, offline sync untested | Kiosk unusable; field nurses can't work offline; UI dead ends | Offline vitals/Rx, Playwright per role, WebSocket live-update required | Phase 6 (Weeks 11-12) |

---

## Phase-by-Phase Breakdown

### Phase 1: Staged OPD Journeys (Weeks 1-2)
**What:** 12 complete OPD patient journeys from identity → prescription → payment → CRM  
**Modules Touched:** patients, auth, visits, doctor, nurse, pharmacy, payment, crm, audit, fhir, lab, equipment  
**DoD:** All 12 tests passing, avg <5s per test, audit trail complete for every action

**Tests:**
```
TC-E2E-001: Face recognition OPD journey
TC-E2E-002: OTP fallback journey
TC-E2E-003: New patient + consent enrollment
TC-E2E-004: Doctor → pharmacy handoff (queue)
TC-E2E-005: Pharmacy pickup (face + OTP verification)
TC-E2E-006: Family member pickup OTP
TC-E2E-007: Allergy/interaction blocking + override
TC-E2E-008: Consultation triggers NHCX claim
TC-E2E-009: Post-visit CRM automation
TC-E2E-010: Equipment lease from consultation
TC-E2E-011: Lab order routing + result callback
TC-E2E-012: Visit cancel/abort/recovery
```

**Deliverables:**
- [ ] `test/e2e/16-staged-opd.e2e-spec.ts` (500+ lines, 12 test cases)
- [ ] Test fixtures: 50+ sample patients with face embeddings
- [ ] Jest orchestration for multi-module tests
- [ ] Staging DB snapshot

---

### Phase 2: Inpatient Hospital Workflows (Weeks 3-4)
**What:** 10 complete inpatient journeys from admission → discharge  
**Modules Touched:** admission, room, operations-crm, nurse, doctor, ot, payment, audit  
**DoD:** All 10 tests passing, bed state consistency verified, discharge summary complete

**Tests:**
```
TC-IPD-001: Admission from OPD
TC-IPD-002: Emergency admission (no OPD)
TC-IPD-003: Transfer between beds/rooms
TC-IPD-004: Discharge + bed turnaround
TC-IPD-005: Bedside medication via QR wristband
TC-IPD-006: Ward round SOAP note entry
TC-IPD-007: OT pre-op checklist enforcement
TC-IPD-008: OT post-op bed reservation
TC-IPD-009: OT cancellation analytics integrity
TC-IPD-010: Insurance pre-auth admission
```

**Deliverables:**
- [ ] `test/e2e/17-inpatient.e2e-spec.ts` (600+ lines)
- [ ] Room/bed occupancy fixtures
- [ ] Ward round SOAP validation
- [ ] OT pre-op checklist tests

---

### Phase 3: Revenue & Security (Weeks 5-6)
**What:** 5 revenue + 18 security tests, proving commercial viability + compliance  
**Modules Touched:** payment, nhcx, auth, patients, audit, gateway, abdm  
**DoD:** All tests passing, RLS violations blocked, encryption verified, rate limits work, audit complete

**Revenue Tests (TC-REV-*):**
```
TC-REV-001: Mixed payment modes (cash + UPI + insurance)
TC-REV-002: Discount authority (RBAC)
TC-REV-003: NHCX coverage check → approval
TC-REV-004: DHIS incentive recording
TC-REV-005: Equipment lease accounting
```

**Security Tests (TC-SEC-*):**
```
TC-SEC-001: Database RLS enforcement (cross-facility block)
TC-SEC-002: Refresh token never plaintext
TC-SEC-003: Old token reuse blocked
TC-SEC-004: Login rate limit (10/min)
TC-SEC-005: OTP send rate limit (5/min)
TC-SEC-006: Global rate limit (100/min)
TC-SEC-007: HTTPS-only + redirect
TC-SEC-008: CORS allowlist (no wildcard)
TC-SEC-009: Helmet security headers (CSP, HSTS, X-Frame-Options)
TC-SEC-010: Raw biometric never persisted
TC-SEC-011: Embeddings encrypted (AES-256)
TC-SEC-012: ABHA encrypted (AES-256)
TC-SEC-013: Deletion SLA (24-hour guarantee)
TC-SEC-014: Processor agreement gate
TC-SEC-015: Incident-response drill (DPDP breach scenario)
TC-SEC-016: ABDM credentials backend-only
TC-SEC-017: Audit completeness (all writes tracked)
TC-SEC-018: Audit retention (7-year ILM)
```

**Deliverables:**
- [ ] `test/e2e/18-revenue.e2e-spec.ts`
- [ ] `test/security/security.spec.ts` (18 security tests)
- [ ] RLS violation test suite
- [ ] Encryption verification scripts
- [ ] Rate limit harness

---

### Phase 4: ABDM/FHIR/NHCX Contracts (Weeks 7-8)
**What:** 10 ABDM Pact + 5 FHIR validation + 6 NHCX Pact contract tests  
**Modules Touched:** abdm, fhir, nhcx, payment  
**DoD:** All contracts passing, FHIR bundles 100% valid, linked to spec versions

**ABDM Contracts (TC-ABDM-*):**
```
TC-ABDM-001: M1 ABHA initiation
TC-ABDM-002: OTP verify
TC-ABDM-003: ABHA address creation
TC-ABDM-004: ABHA verification
TC-ABDM-005: Care-context linking init
TC-ABDM-006: Care-context linking confirm
TC-ABDM-007: Consent request
TC-ABDM-008: Consent notification callback
TC-ABDM-009: Health-information fetch
TC-ABDM-010: Token cache refresh
```

**FHIR Validation (TC-FHIR-*):**
```
TC-FHIR-001: Every outbound bundle validates (100% pass rate)
TC-FHIR-002: Consultation bundle validation
TC-FHIR-003: MedicationRequest validation
TC-FHIR-004: Claim-related bundle validation
TC-FHIR-005: Discharge/inpatient validation
```

**NHCX Contracts (TC-NHCX-*):**
```
TC-NHCX-001: CoverageEligibilityRequest
TC-NHCX-002: Claim submit
TC-NHCX-003: Claim status callback
TC-NHCX-004: Partial approval mapping
TC-NHCX-005: Rejection/denial mapping
TC-NHCX-006: Unknown callback handling
```

**Deliverables:**
- [ ] `test/contracts/abdm-pact.js`
- [ ] `test/contracts/nhcx-pact.js`
- [ ] `test/fhir/fhir-validation.spec.ts`
- [ ] FHIR IG profile references
- [ ] Pact broker integration

---

### Phase 5: Performance, Load, Stress, Soak, Failover (Weeks 9-10)
**What:** Load tests (9), stress tests (5), soak tests (3), resilience tests (5) against TRD SLAs  
**Tools:** k6 for load/stress, artillery for soak, manual failover simulation  
**DoD:** All SLA targets met, system stable under stress, no data corruption

**Load Tests (TC-LOAD-*):**
```
TC-LOAD-001: p95 <300ms standard API (100 CU)
TC-LOAD-002: Queue responsive at 500 CU
TC-LOAD-003: Vitals save under 200-500 CU peak
TC-LOAD-004: Face match <800ms at 50k patients
TC-LOAD-005: Consultation sign-off <500ms, FHIR <30s
TC-LOAD-006: ABDM M3 fetch p95 <5s
TC-LOAD-007: Occupancy board <50ms (cache)
TC-LOAD-008: Admission creation <1s
TC-LOAD-009: Ward-round stop <500ms
```

**Stress Tests (TC-STRESS-*):**
```
TC-STRESS-001: 2× peak OPD (>500 CU)
TC-STRESS-002: 3× OTP/login burst
TC-STRESS-003: Face-match storm
TC-STRESS-004: Claim & FHIR queue flood
TC-STRESS-005: Report/dashboard spike
```

**Soak Tests (TC-SOAK-*):**
```
TC-SOAK-001: 12-hour clinic-day soak
TC-SOAK-002: 24-hour mixed hospital workload
TC-SOAK-003: 24-hour notification campaign soak
```

**Resilience Tests (TC-RES-*):**
```
TC-RES-001: Redis unavailable
TC-RES-002: Postgres failover
TC-RES-003: Worker restart (FHIR/NHCX idempotency)
TC-RES-004: Auto-scaling 0→10 tasks <2min
TC-RES-005: PgBouncer pool exhaustion (200 connections)
```

**Deliverables:**
- [ ] k6 scripts in `test/load/` (all 9 load scenarios)
- [ ] k6 scripts in `test/stress/` (all 5 stress scenarios)
- [ ] 24-hour soak script
- [ ] Failover simulation scripts
- [ ] CloudWatch/DataDog dashboard
- [ ] Performance baseline report

---

### Phase 6: Mobile/Offline & UI (Weeks 11-12)
**What:** Playwright per-role E2E, Espresso kiosk, Compose mobile, offline sync, WebSocket live updates  
**Tools:** Playwright, Espresso (Android), Jetpack Compose, WireMock  
**DoD:** 5 Playwright journeys complete, offline sync proven, WebSocket updates <500ms

**Playwright Journeys (TC-UI-001 to TC-UI-005):**
```
TC-UI-001: Receptionist journey
TC-UI-002: Nurse journey (vitals → handoff)
TC-UI-003: Doctor journey (consult → sign-off)
TC-UI-004: Pharmacist journey (queue → dispense)
TC-UI-005: Admin journey (dashboard → reports)
```

**Mobile/Offline (TC-UI-006 to TC-OFF-003):**
```
TC-UI-006: Espresso kiosk (face/OTP → visit start)
TC-UI-007: Compose vitals entry
TC-UI-008: Compose MAR (bedside medication)
TC-UI-009: Compose prescription flow
TC-OFF-001: Offline vitals (WAN lost → sync on reconnect)
TC-OFF-002: Offline basic Rx
TC-OFF-003: Offline queue conflict resolution
```

**Live Updates (TC-LIVE-001):**
```
TC-LIVE-001: WebSocket bed board (real-time <500ms)
```

**Deliverables:**
- [ ] `test/ui/` Playwright scripts (5 journeys)
- [ ] Android Espresso tests (if kiosk exists)
- [ ] Compose integration tests
- [ ] Offline state sync test
- [ ] WebSocket live-update test

---

### Phase 7: Endpoint Module Coverage (Weeks 13-14)
**What:** Integration tests for all 50+ high-risk endpoints not yet proven  
**Coverage:** 95%+ line coverage on business logic  
**DoD:** All endpoints tested, RBAC verified, error codes mapped

**Endpoint Coverage:**
```
patients:
  - search, by-id, update, merge, consent-revoke, face-match negative

abdm:
  - initiate-abha, verify-otp, create-address, verify-abha
  - init-linking, confirm-link, request-consent
  - abdm-history, care-contexts, publish-fhir
  - inbound-notify, fetch-health, S3 storage

payment/nhcx:
  - submit-nhcx-claim, nhcx-status, revenue-summary
  - dhis-dashboard, equipment-util, crm-analytics

crm:
  - patient-profile, LTV-scoring, churn-risk
  - segment-override, campaign-generation, refill-reminder, lab-result-notify

audit:
  - export, manual-log, write-completeness
  - retention-policy, large-export-perf

operations-crm:
  - bed-occupancy-analytics, staff-rostering, dept-P&L
  - pre-auth-tracking, consumables-mgmt, nightly-heavy-jobs
```

**Deliverables:**
- [ ] Integration tests for each endpoint group
- [ ] Permission matrix tests
- [ ] Staging DB fixtures
- [ ] Coverage report (95%+ business logic)

---

## Resource & Infrastructure Requirements

### Tools to Install

```bash
# Load testing
npm install --save-dev k6

# Contract testing
npm install --save-dev @pact-foundation/pact

# FHIR validation
npm install --save-dev @hapifhir/hapi-fhir-validator

# Browser E2E
npm install --save-dev @playwright/test

# Service mocking
npm install --save-dev @wiremock/jest-extension

# Existing but verify
npm install --save-dev @nestjs/testing supertest
```

### Test Fixtures (create in `test/fixtures/`)

- [ ] `patients.ts` - 50+ patients with face embeddings
- [ ] `facilities.ts` - 2-3 facilities (test cross-facility RLS)
- [ ] `users.ts` - users per role (doctor, nurse, pharmacist, admin, receptionist)
- [ ] `rooms.ts` - 20+ rooms with occupancy states
- [ ] `seed.ts` - database seeding script
- [ ] `cleanup.ts` - transactional cleanup

### CI/CD Integration

- [ ] GitHub Actions: E2E tests on every push
- [ ] Nightly load test runs (staging)
- [ ] Weekly soak test runs (24 hours)
- [ ] Pact broker: contract test publication
- [ ] CodeCov: coverage reporting
- [ ] Performance baseline tracking

---

## Definition of Done (Across All Phases)

Each test case must satisfy:

✅ **Functional Correctness:**
- [ ] Entry state clearly documented
- [ ] Steps explicit and repeatable
- [ ] Exit state assertions comprehensive
- [ ] No hardcoded sleeps; proper event waits
- [ ] Cross-module state consistency verified

✅ **Auditability:**
- [ ] Every material action logged in audit table
- [ ] Audit entries include: action, user, timestamp, entity, change details
- [ ] Audit trail verifiable in test assertions

✅ **Performance:**
- [ ] Test duration reasonable (<5s for most E2E)
- [ ] Baseline latency captured (e.g., face match <800ms)
- [ ] SLA violations documented and justified

✅ **Reliability:**
- [ ] Test passes consistently (3x run = 3x pass)
- [ ] Transactional cleanup between tests
- [ ] No flakiness (network, timing, race conditions)
- [ ] Failed test produces clear diagnostic output

✅ **Documentation:**
- [ ] Test name matches TC-NNN convention
- [ ] Purpose and business value documented
- [ ] Assertions linked to TRD requirements
- [ ] Dependencies clearly listed

---

## Success Metrics

| Metric | Current | Target | Phase |
|--------|---------|--------|-------|
| Total tests | 988 | 1,500+ | End of Phase 7 |
| E2E module tests | 560 | 560 | Baseline |
| Unit tests | 427 | 427 | Baseline |
| Staged journey tests | 0 | 12 (OPD) + 10 (IPD) | Phase 1-2 |
| Revenue tests | 0 | 5 | Phase 3 |
| Security tests | 0 | 18 | Phase 3 |
| Contract tests | 0 | 21 (ABDM + FHIR + NHCX) | Phase 4 |
| Load test coverage | 0 | 9 | Phase 5 |
| Stress test coverage | 0 | 5 | Phase 5 |
| Soak test coverage | 0 | 3 | Phase 5 |
| Resilience tests | 0 | 5 | Phase 5 |
| UI E2E journeys | 0 | 5 (Playwright) | Phase 6 |
| Mobile offline tests | 0 | 3 | Phase 6 |
| Live update tests | 0 | 1 | Phase 6 |
| Endpoint coverage | Low | 95%+ business logic | Phase 7 |
| Test pass rate | 99.9% | 100% | All phases |
| Code coverage (business logic) | ~80% | ≥95% | All phases |

---

## Sign-Off Checklist (Go-Live Gate)

Before shipping to production, verify:

✅ **Phase 1 (Staged OPD):**
- [ ] 12/12 E2E journeys passing
- [ ] Audit trails complete for every action
- [ ] Patient context maintained across modules
- [ ] No duplicate records created

✅ **Phase 2 (Inpatient):**
- [ ] 10/10 inpatient journeys passing
- [ ] Bed state consistency verified
- [ ] Discharge summary completeness enforced
- [ ] Insurance pre-auth flow working

✅ **Phase 3 (Revenue & Security):**
- [ ] 5/5 revenue tests passing
- [ ] 18/18 security tests passing
- [ ] RLS violations blocked
- [ ] Encryption verified (biometric + ABHA)
- [ ] Rate limits protecting system
- [ ] Audit retention configured

✅ **Phase 4 (Contracts):**
- [ ] ABDM Pact contracts: 10/10 passing
- [ ] FHIR validation: 5/5 at 100% pass rate
- [ ] NHCX Pact contracts: 6/6 passing
- [ ] FHIR bundles validated in publish pipeline

✅ **Phase 5 (Performance):**
- [ ] Load tests: all SLAs met
- [ ] Stress tests: no data corruption
- [ ] Soak tests: stable for 24 hours
- [ ] Auto-scaling: 0→10 tasks in <2 min

✅ **Phase 6 (Mobile/Offline):**
- [ ] Playwright journeys: 5/5 complete per role
- [ ] Offline sync: no duplicates on reconnect
- [ ] WebSocket updates: <500ms latency
- [ ] Kiosk: no dead ends

✅ **Phase 7 (Endpoint Coverage):**
- [ ] 95%+ line coverage on business logic
- [ ] All endpoints tested (valid + invalid inputs)
- [ ] RBAC permission matrix verified
- [ ] Error codes mapped to requirements

✅ **Overall:**
- [ ] All test suites automated in CI/CD
- [ ] Performance baselines captured
- [ ] Security audit passed
- [ ] Compliance proof documented
- [ ] Known issues logged + prioritized

---

## Next Steps

1. **This Week:** 
   - [ ] Prioritize Phase 1 tests (TC-E2E-001 to TC-E2E-012)
   - [ ] Create test fixtures (patients, users, facilities)
   - [ ] Set up Jest orchestration for multi-module tests

2. **Week 1-2:**
   - [ ] Implement all 12 OPD journey tests
   - [ ] Verify audit trail completeness
   - [ ] Achieve 100% pass rate

3. **Week 3-4:**
   - [ ] Implement all 10 IPD journey tests
   - [ ] Verify bed state consistency
   - [ ] Achieve 100% pass rate

4. **Ongoing:**
   - [ ] Weekly progress review against Phase timelines
   - [ ] Escalate blockers immediately
   - [ ] Track test execution times (optimize slow tests)
   - [ ] Update this plan as modules are enhanced

---

## References

- **TEST_MATURITY_PLAN.md** — Full 14-week roadmap with all test cases, SLA targets, and DoD criteria
- **TEST_CASES_BY_CATEGORY.md** — Detailed test case specifications (entry/exit states, assertions)
- **MODULE_STATUS_AND_TESTING.md** — Module-by-module status and testing gaps

---

**Prepared by:** Claude Code  
**Reviewed by:** [User]  
**Approved by:** [Go-Live PM]  
**Target Go-Live:** [After all 7 phases passing]

**Last Updated:** 2026-04-14  
**Status:** Ready for Phase 1 Implementation
