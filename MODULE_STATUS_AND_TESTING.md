# SmartOPD Module Status & Testing Requirements

**Date:** 2026-04-14  
**Purpose:** Inventory module implementation status and identify gaps in test coverage

---

## Module Status Overview

| Module | Status | Current Tests | Required Tests | Priority |
|--------|--------|----------------|-----------------|----------|
| **patients** | ✅ Implemented | 17 unit | Face match corpus, consent revocation, merge edge cases | HIGH |
| **auth** | ✅ Implemented | 24 unit | Rate limits, token refresh rotation, HTTPS redirect | HIGH |
| **visits** | ✅ Implemented | 18 unit | State machine, cancellation recovery, concurrent updates | HIGH |
| **doctor** | ✅ Implemented | 22 unit | Consultation signing, FHIR bundle generation | HIGH |
| **nurse** | ✅ Implemented | 17 unit | Vitals validation, allergy intake, ward round SOAP | HIGH |
| **pharmacy** | ✅ Implemented | 19 unit | Dispense verification (face + OTP), family pickup | HIGH |
| **payment** | ✅ Implemented | 13 unit | Mixed payment modes, NHCX coverage, discount authority | HIGH |
| **admission** | ✅ Implemented | 16 unit | OPD→IPD conversion, emergency admit, pre-auth flow | HIGH |
| **room** | ✅ Implemented | 17 unit | Bed state transitions, occupancy board cache, transfers | HIGH |
| **ot** | ✅ Implemented | 18 unit | Pre-op checklist enforcement, post-op bed reservation | HIGH |
| **equipment** | ✅ Implemented | 16 unit | Lease lifecycle, revenue accounting, return workflow | MEDIUM |
| **lab** | ✅ Implemented | 15 unit | Order routing, partner callback handling, result linking | MEDIUM |
| **crm** | ✅ Implemented | 16 unit | Campaign generation, LTV scoring, churn risk prediction | MEDIUM |
| **notification** | ✅ Implemented | 13 unit | Reminder scheduling, campaign delivery, WebSocket updates | MEDIUM |
| **reports** | ✅ Implemented | 21 unit | Dashboard queries, analytics accuracy, export performance | MEDIUM |
| **fhir** | ✅ Implemented | 27 unit | Bundle validation, consultation/claim/discharge bundles | HIGH |
| **nhcx** | ✅ Implemented | 15 unit | Claim submission, status callback, partial approval mapping | HIGH |
| **abdm** | ✅ Implemented | 12 unit | ABHA initiation, consent workflow, health-info fetch | HIGH |
| **operations-crm** | ✅ Implemented | 15 unit | Occupancy analytics, staff rostering, bed P&L tracking | MEDIUM |
| **gateway** | ✅ Implemented | 21 unit | CORS, HTTPS, Helmet headers, rate limits | HIGH |
| **redis** | ✅ Implemented | 26 unit | Token caching, session management, queue consumer | MEDIUM |
| **queue** | ✅ Implemented | 16 unit | Job queuing, async claim/FHIR publishing, worker resilience | MEDIUM |
| **audit** | ✅ Implemented | - | RLS enforcement, retention policy, completeness, export | HIGH |
| **users** | ✅ Implemented | 25 unit | RBAC per endpoint, facility scoping, role inheritance | HIGH |
| **common** | ✅ Implemented | - | Decorators, guards, interceptors, error handling | MEDIUM |

---

## Detailed Module Testing Requirements

### 1. patients

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Patient CRUD (create, read, update, delete)
- ✅ Face enrollment
- ✅ OTP identity
- ✅ ABDM linking
- ✅ XSS prevention (separate spec)

**Missing Tests (HIGH PRIORITY):**
- [ ] Face match at realistic corpus scale (10k, 50k patients)
- [ ] Face match negative cases (no match, low confidence threshold)
- [ ] Duplicate patient prevention (merge logic)
- [ ] Consent revocation handling (DPDP deletion cascade)
- [ ] Patient search performance under load

**Test Gaps to Address:**
```
TC-PAT-001: Face match corpus scale (50k patients)
  - Create 50k patients with embeddings
  - Time 1:N face match query
  - Assert <800ms (TRD requirement)

TC-PAT-002: Consent revocation
  - Create patient with face + ABHA
  - Revoke consent
  - Assert: face embedding zeroed in 24h, audit logged
  
TC-PAT-003: Patient merge
  - Create duplicate patient records
  - Merge with preferred ID
  - Assert: all visits/admissions linked to preferred ID
```

**Module Implementation Status:**
- [x] Patient entity with face embedding + ABHA fields
- [x] Face enrollment endpoint
- [x] OTP endpoint
- [x] Search by name, phone, ABHA
- [ ] Batch export with RLS enforcement
- [ ] Consent revocation handler (may need enhancement)

**Dependencies:**
- Face embedding library (pinecone? proprietary?)
- Consent module (may need creation)
- ABDM SDK

---

### 2. auth

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ JWT generation and validation
- ✅ OTP generation and verification
- ✅ Passport integration (JWT + Local)
- ✅ Password hashing

**Missing Tests (HIGH PRIORITY):**
- [ ] Refresh token rotation (old token reuse blocked)
- [ ] Refresh token never plaintext in DB
- [ ] Login rate limit (10/min per IP)
- [ ] OTP send rate limit (5/min per IP/phone)
- [ ] HTTPS-only enforcement
- [ ] Token expiry at correct interval

**Test Gaps:**
```
TC-SEC-002: Refresh token plaintext check
  - Login → inspect DB auth_tokens table
  - Assert: refresh_token is bcrypt hash, never plaintext

TC-SEC-003: Old token reuse blocked
  - Login → get refresh token (TOKEN_A)
  - Call refresh → get new token (TOKEN_B)
  - Attempt refresh with TOKEN_A again
  - Assert: 401 Unauthorized

TC-SEC-004: Login rate limit
  - 10 failed login attempts from same IP
  - Assert: throttled after 10, 429 Too Many Requests
```

**Module Implementation Status:**
- [x] JWT service (JwtService)
- [x] Passport strategies (jwt, local)
- [x] Login endpoint
- [x] Refresh endpoint
- [ ] Rate limiting guard (may exist in gateway, verify)
- [ ] Refresh token rotation (verify implementation)
- [ ] HTTPS-only flag in session cookies (verify)

**Dependencies:**
- @nestjs/jwt
- @nestjs/passport
- passport-jwt
- bcryptjs

---

### 3. visits

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Visit CRUD
- ✅ Visit state transitions
- ✅ Queue management
- ✅ Doctor assignment

**Missing Tests (HIGH PRIORITY):**
- [ ] State machine validation (allowed transitions)
- [ ] Concurrent visit creation (no duplicates)
- [ ] Cancellation before/after triage (no orphan records)
- [ ] System recovery after crash (idempotency)
- [ ] Bill rollback on visit cancellation

**Test Gaps:**
```
TC-E2E-012 (part 1): Visit cancellation
  - Create visit, record vitals
  - Cancel before doctor
  - Assert: no duplicate bill, queue cleaned up

TC-E2E-012 (part 3): System recovery
  - Doctor signs off, system crashes
  - On recovery, verify visit can be re-completed without duplication
```

**Module Implementation Status:**
- [x] Visit entity with state machine
- [x] Visit creation endpoint
- [x] Visit status update endpoint
- [x] Queue integration
- [ ] Transactional consistency (verify ACID behavior)
- [ ] Concurrent update handling (verify optimistic locking)

**Dependencies:**
- TypeORM (entities, repositories)
- Queue module
- Doctor module

---

### 4. doctor

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Consultation CRUD
- ✅ Prescription creation
- ✅ Sign-off workflow

**Missing Tests (HIGH PRIORITY):**
- [ ] Consultation sign-off triggers FHIR publish within 30s
- [ ] Drug-allergy interaction check
- [ ] Allergy override audit
- [ ] Lab order routing
- [ ] Equipment order creation

**Test Gaps:**
```
TC-E2E-007: Allergy interaction block
  - Record allergy in nurse triage
  - Doctor attempts to prescribe conflicting drug
  - Assert: warning shown, override required, audit logged

TC-E2E-004: Pharmacy handoff
  - Doctor submits consultation
  - Pharmacy queue updated within 1s
  - Pharmacist sees prescription automatically

TC-E2E-008: NHCX claim triggered
  - Doctor signs off → claim job enqueued
  - Claim job generates FHIR bundle
  - Assert: NHCX submission successful, claim ID in Bill
```

**Module Implementation Status:**
- [x] Consultation entity
- [x] Consultation creation + submission endpoint
- [x] Prescription creation
- [x] Sign-off endpoint
- [ ] FHIR bundle generation on sign-off (verify)
- [ ] Drug-allergy check integration (may need enhancement)
- [ ] Lab/equipment order creation (may exist in separate modules)
- [ ] Async job enqueueing for claim submission (verify)

**Dependencies:**
- Pharmacy module (prescription format)
- Allergy detection (patients module)
- FHIR module (bundle generation)
- Lab, Equipment modules
- BullMQ (for async jobs)

---

### 5. nurse

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Vitals entry
- ✅ Triage workflow
- ✅ Patient handoff to doctor

**Missing Tests (HIGH PRIORITY):**
- [ ] Allergy intake + audit
- [ ] Ward round SOAP note entry
- [ ] Ward round order generation
- [ ] MAR (Medication Administration Record) entry
- [ ] QR wristband identity + MAR bedside

**Test Gaps:**
```
TC-E2E-007: Allergy intake
  - Nurse triage asks about allergies
  - Patient reports penicillin allergy
  - Assert: allergy stored, visible to doctor

TC-IPD-005: Bedside MAR
  - Nurse scans QR wristband
  - System displays medication details
  - Nurse administers, confirms
  - Assert: MAR entry created with timestamp + nurse ID

TC-IPD-006: Ward round
  - Doctor enters SOAP note
  - Doctor issues orders
  - Assert: nursing tasks generated from orders
```

**Module Implementation Status:**
- [x] Vitals entity
- [x] Vitals entry endpoint
- [ ] Allergy intake form (may need creation)
- [ ] Ward round module (may need enhancement)
- [ ] MAR entity (may need creation)
- [ ] QR identity resolution (may need integration)

**Dependencies:**
- Patients module (allergy data)
- Admission module (inpatient context)
- Queue module (task generation)

---

### 6. pharmacy

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Dispensing workflow
- ✅ Prescription queue
- ✅ Medication issuance

**Missing Tests (HIGH PRIORITY):**
- [ ] Face verification at pharmacy
- [ ] OTP verification for pickup
- [ ] Family member pickup (OTP-based)
- [ ] Medication batch + expiry tracking
- [ ] Interaction warnings + override
- [ ] Staff attribution logging

**Test Gaps:**
```
TC-E2E-005 (Face): Patient face verification at pharmacy
  - Pharmacist initiates pickup
  - Patient scans face at kiosk
  - System matches face + displays medication
  - Assert: audit includes face_verified flag

TC-E2E-005 (OTP): OTP verification for pickup
  - Pharmacist initiates pickup
  - OTP sent to patient
  - Patient enters OTP on kiosk
  - Assert: audit includes otp_verified flag

TC-E2E-006: Family member pickup
  - Family receives pickup OTP link
  - Family enters OTP
  - Medication dispense marked as family pickup
  - Assert: family name in audit, not patient identity
```

**Module Implementation Status:**
- [x] Prescription entity
- [x] Dispense endpoint
- [ ] Face verification integration (may need)
- [ ] OTP verification integration (may need)
- [ ] Family pickup workflow (may need)
- [ ] Batch + expiry tracking (may need enhancement)
- [ ] Interaction check integration (need to verify)

**Dependencies:**
- Patients module (face match)
- Auth module (OTP)
- Doctor module (prescription validation)
- Audit module (staff + action logging)

---

### 7. payment

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Bill creation
- ✅ Payment processing
- ✅ Razorpay integration
- ✅ Invoice generation

**Missing Tests (HIGH PRIORITY):**
- [ ] Mixed payment modes (cash + UTP + insurance)
- [ ] NHCX coverage check + claim state mapping
- [ ] Discount application (RBAC)
- [ ] DHIS incentive recording
- [ ] Equipment lease fee + deposit accounting
- [ ] Bill state consistency under concurrent updates

**Test Gaps:**
```
TC-REV-001: Mixed payment modes
  - Create bill with cash + UPI split
  - Process payments separately
  - Assert: total, balance, ledger entries correct

TC-REV-003: NHCX coverage check
  - Check insurance eligibility
  - Bill amount matches approved coverage
  - Claim submitted and tracked
  - Assert: bill state, approved amount, claim ID align

TC-REV-004: DHIS incentive
  - Visit generates DHIS-eligible transaction
  - Record created in DHIS table
  - Assert: amount, type, patient, facility linked

TC-REV-005: Equipment lease accounting
  - Doctor orders equipment lease
  - Deposit calculated and charged
  - Rental period tracked
  - Return initiates refund calculation
  - Assert: P&L impact correct
```

**Module Implementation Status:**
- [x] Bill entity
- [x] Payment entity
- [x] Razorpay integration
- [ ] Mixed payment mode support (verify/enhance)
- [ ] NHCX coverage check integration (verify)
- [ ] Discount RBAC enforcement (verify)
- [ ] DHIS incentive recording (may need)
- [ ] Equipment lease accounting (may need)

**Dependencies:**
- Visits module (bill context)
- NHCX module (coverage check, claim status)
- Equipment module (lease details)
- Audit module (transaction tracking)

---

### 8. admission

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Admission CRUD
- ✅ Bed assignment
- ✅ Discharge workflow

**Missing Tests (HIGH PRIORITY):**
- [ ] OPD→IPD conversion (context continuity)
- [ ] Emergency admission (no prior OPD)
- [ ] Insurance pre-auth integration
- [ ] Discharge summary completeness
- [ ] Concurrent admission creation (no duplicates)

**Test Gaps:**
```
TC-IPD-001: OPD→IPD conversion
  - Doctor ends OPD consultation
  - Doctor submits admission
  - Assert: admission linked to OPD visit, patient ID same

TC-IPD-002: Emergency admission
  - Create admission without OPD visit
  - Assign bed, create nursing care plan
  - Assert: admission valid, no broken references

TC-IPD-010: Insurance pre-auth
  - Create admission with insurance
  - System sends pre-auth request
  - Insurer approves/denies
  - Assert: pre-auth status in admission, bill cap enforced
```

**Module Implementation Status:**
- [x] Admission entity
- [x] Admission creation + update endpoint
- [x] Bed assignment integration
- [ ] OPD→IPD conversion endpoint (may need)
- [ ] Insurance pre-auth integration (may need)
- [ ] Discharge summary validation (may need enhancement)

**Dependencies:**
- Visits module (OPD context)
- Room module (bed assignment)
- Payment module (billing context)
- NHCX module (pre-auth)
- Audit module (workflow trace)

---

### 9. room

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Room CRUD
- ✅ Bed creation
- ✅ Occupancy board

**Missing Tests (HIGH PRIORITY):**
- [ ] Occupancy board cache performance (<50ms)
- [ ] Bed state transitions (consistency)
- [ ] Concurrent bed assignments (no double-booking)
- [ ] Transfer workflow (release + assign atomicity)
- [ ] Housekeeping SLA tracking

**Test Gaps:**
```
TC-LOAD-007: Occupancy board cache
  - Repeated board reads + concurrent bed updates
  - Assert: board load <50ms, no stale state

TC-IPD-003: Transfer atomicity
  - Transfer patient between beds
  - Verify: old bed released, new bed assigned, occupancy updated atomically
  - Assert: no race condition (neither bed double-booked, neither orphaned)

TC-IPD-004: Housekeeping SLA
  - Patient discharged, bed released
  - Housekeeping task created with SLA timer
  - Assert: SLA tracked and reported
```

**Module Implementation Status:**
- [x] Room entity
- [x] Bed entity
- [x] Occupancy board endpoint
- [ ] Cache layer (verify Redis caching)
- [ ] State machine (verify atomic transitions)
- [ ] Transfer atomicity (verify transaction handling)
- [ ] Housekeeping SLA (may need enhancement)

**Dependencies:**
- Admission module (bed assignment)
- Operations-CRM module (housekeeping tasks)
- Redis module (cache)
- Audit module (state transition logging)

---

### 10. ot

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ OT booking CRUD
- ✅ Surgery scheduling
- ✅ OT dashboard

**Missing Tests (HIGH PRIORITY):**
- [ ] Pre-op checklist enforcement (hard block)
- [ ] Post-op bed reservation
- [ ] OT cancellation + analytics impact
- [ ] Concurrent OT bookings (no double-booking)
- [ ] Surgeon throughput analytics accuracy

**Test Gaps:**
```
TC-IPD-007: Pre-op checklist block
  - Create OT booking
  - Attempt to start with incomplete checklist
  - Assert: system blocks start, shows missing item

TC-IPD-008: Post-op bed reservation
  - Create OT booking
  - If post-op bed unavailable, warn or block
  - If available, reserve

TC-IPD-009: Cancellation analytics
  - Cancel OT booking
  - Verify: cancellation count incremented, surgeon stats updated
  - Assert: analytics accuracy maintained
```

**Module Implementation Status:**
- [x] OT booking entity
- [x] OT booking creation + update endpoint
- [ ] Pre-op checklist enforcement (verify hard block)
- [ ] Post-op bed reservation integration (may need)
- [ ] Cancellation analytics tracking (verify)

**Dependencies:**
- Room module (bed availability)
- Admission module (OT context)
- Reports module (analytics)
- Audit module (cancellation tracking)

---

### 11. equipment

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Equipment CRUD
- ✅ Equipment lease workflow
- ✅ Return processing

**Missing Tests (MEDIUM PRIORITY):**
- [ ] Lease lifecycle (issue → reminder → return → refund)
- [ ] Revenue accounting (fee, deposit, deduction)
- [ ] Consumables tracking
- [ ] Concurrent lease operations

**Test Gaps:**
```
TC-E2E-010: Equipment lease from consultation
  - Doctor orders equipment
  - Lease created, deposit charged
  - Return scheduled with reminder
  - CRM follow-up created
  - Assert: clinical origin, financial tracking, reminder scheduling

TC-REV-005: Lease accounting
  - Lease issued, deposit paid
  - Lease period elapses
  - Return initiated, condition assessed
  - Refund/deduction calculated
  - Assert: P&L ledger reconciles
```

**Module Implementation Status:**
- [x] Equipment entity
- [x] Lease entity
- [x] Issue + return endpoints
- [ ] Lease lifecycle job (may need)
- [ ] Revenue accounting integration (may need)
- [ ] Consumables tracking (may need)

**Dependencies:**
- Doctor module (order context)
- Payment module (fee/deposit)
- Notification module (return reminder)
- Reports module (utilization analytics)

---

### 12. lab

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Lab order CRUD
- ✅ Partner integration
- ✅ Result callback handling

**Missing Tests (MEDIUM PRIORITY):**
- [ ] Lab order routing to external partner
- [ ] Result callback parsing + storage
- [ ] Result visibility in doctor dashboard
- [ ] Partner API error handling

**Test Gaps:**
```
TC-E2E-011: Lab order routing
  - Doctor places lab order
  - Order routed to partner (mock API)
  - Partner returns result via callback
  - Doctor sees result in patient context
  - Assert: order traceability, result accuracy
```

**Module Implementation Status:**
- [x] Lab order entity
- [x] Lab order creation endpoint
- [x] Partner callback endpoint
- [ ] Result parsing + validation (verify)
- [ ] Doctor dashboard integration (verify)

**Dependencies:**
- Doctor module (order context)
- Visits module (visit context)
- Audit module (order trace)

---

### 13. crm

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ CRM profile CRUD
- ✅ Campaign creation
- ✅ Patient segmentation

**Missing Tests (MEDIUM PRIORITY):**
- [ ] Post-visit follow-up automation
- [ ] LTV scoring accuracy
- [ ] Churn risk prediction
- [ ] Campaign delivery + effectiveness tracking
- [ ] Lab result notification automation

**Test Gaps:**
```
TC-E2E-009: Post-visit CRM automation
  - Visit completed
  - CRM rules evaluated (chronic patient → follow-up)
  - Follow-up task + reminder created
  - Assert: automation triggered, notification scheduled

TC-CRM-001: LTV scoring
  - Patient with multiple visits
  - Calculate LTV score
  - Assert: score reflects visit frequency, payment history, insurance status
```

**Module Implementation Status:**
- [x] Patient profile entity
- [x] Campaign entity
- [x] CRM rules engine
- [ ] Post-visit automation (verify)
- [ ] LTV/churn scoring (verify accuracy)
- [ ] Campaign delivery tracking (verify)

**Dependencies:**
- Visits module (visit completion)
- Notification module (reminder + campaign delivery)
- Reports module (campaign analytics)

---

### 14. notification

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Notification creation
- ✅ SMS/email sending (mocked)
- ✅ Queue management

**Missing Tests (MEDIUM PRIORITY):**
- [ ] Reminder scheduling (at correct time)
- [ ] Campaign bulk delivery
- [ ] WebSocket real-time updates (bed board)
- [ ] Notification retry logic

**Test Gaps:**
```
TC-LIVE-001: WebSocket bed board
  - Two staff members viewing occupancy board
  - One changes bed state
  - Other sees update in real-time (<500ms)
  - Assert: state consistency, no websocket reconnection issues
```

**Module Implementation Status:**
- [x] Notification entity
- [x] SMS/email service integration
- [x] Queue consumer
- [ ] WebSocket gateway (verify)
- [ ] Reminder scheduling (verify accuracy)
- [ ] Bulk campaign delivery (verify performance)

**Dependencies:**
- Redis module (session management)
- Queue module (async delivery)
- BullMQ (job scheduling)

---

### 15. reports

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Dashboard queries
- ✅ Visit statistics
- ✅ Payment reports

**Missing Tests (MEDIUM PRIORITY):**
- [ ] Analytics correctness under concurrent updates
- [ ] Report export performance
- [ ] DHIS dashboard data accuracy
- [ ] Equipment utilization analytics
- [ ] OT throughput + cancellation analytics

**Test Gaps:**
```
TC-LOAD-009: Ward-round stop write + reporting
  - Multiple doctors entering ward round notes
  - Dashboard showing updated patient counts
  - Assert: reporting accuracy, no data corruption

TC-IPD-009: OT analytics accuracy
  - Create, cancel, perform OT bookings
  - Verify: OT utilization, surgeon throughput, cancellation rates correct
```

**Module Implementation Status:**
- [x] Dashboard endpoints
- [x] Report queries (visits, payments, etc.)
- [ ] Real-time analytics (verify)
- [ ] Export performance optimization (may need)
- [ ] DHIS integration (verify)
- [ ] OT/equipment analytics (verify accuracy)

**Dependencies:**
- All clinical modules (data sources)
- Audit module (historical queries)

---

### 16. fhir

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Bundle creation
- ✅ Serialization

**Missing Tests (HIGH PRIORITY):**
- [ ] Consultation bundle validation against ABDM IG
- [ ] Medication request bundle validation
- [ ] Claim bundle validation
- [ ] Discharge/inpatient bundle validation
- [ ] 100% validation pass rate in publish pipeline

**Test Gaps:**
```
TC-FHIR-001 to TC-FHIR-005: FHIR validation
  - Create bundles for each clinical scenario
  - Validate against ABDM FHIR IG
  - Assert: 100% pass rate, no validation errors

TC-E2E-008: Consultation bundle within 30s
  - Doctor signs off consultation
  - FHIR bundle generated + published to ABDM
  - Assert: bundle generated within 30s
```

**Module Implementation Status:**
- [x] FHIR bundle builder
- [x] Consultation bundle creation
- [ ] FHIR validation library integration (may need)
- [ ] Claim + discharge bundle builders (verify completeness)
- [ ] Validation in publish pipeline (may need)

**Dependencies:**
- ABDM module (FHIR IG spec)
- Validation library (hl7.fhir.* validator)

---

### 17. nhcx

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Claim submission
- ✅ Webhook callback handling

**Missing Tests (HIGH PRIORITY):**
- [ ] Coverage eligibility check accuracy
- [ ] Claim status callback integration
- [ ] Partial approval mapping to bill state
- [ ] Denial/rejection handling
- [ ] Unknown callback resilience (no data corruption)

**Test Gaps:**
```
TC-REV-003: NHCX coverage check
  - Check insurance eligibility
  - Submit claim
  - Receive approval webhook
  - Assert: bill state, approved amount, claim ID consistent

TC-NHCX-004: Partial approval
  - Bill amount: $100
  - Approved amount: $75
  - Assert: bill cap enforced, patient owes difference

TC-NHCX-006: Unknown callback
  - Receive unexpected callback format
  - Assert: system doesn't crash, callback logged, no state corruption
```

**Module Implementation Status:**
- [x] Claim submission endpoint
- [x] Callback webhook handler
- [x] NHCX API integration
- [ ] Coverage eligibility check (verify completeness)
- [ ] Partial approval mapping (may need enhancement)
- [ ] Error resilience (verify robustness)

**Dependencies:**
- Payment module (bill state)
- Audit module (callback logging)

---

### 18. abdm

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ ABHA initiation
- ✅ Consent management

**Missing Tests (HIGH PRIORITY):**
- [ ] Pact contracts (10 scenarios)
- [ ] Token refresh behavior (no stale tokens)
- [ ] Callback payload validation
- [ ] Health-information fetch latency <5s
- [ ] Credential backend-only isolation

**Test Gaps:**
```
TC-ABDM-001 to TC-ABDM-010: Pact contracts
  - Each ABDM API flow tested with Pact
  - Request/response shapes match spec
  - Token refresh works before expiry
  - Assert: 100% contract pass rate

TC-SEC-016: ABDM credentials backend-only
  - Attempt to access ABDM credentials from client/mobile
  - Assert: 401 Unauthorized, no credential exposure
```

**Module Implementation Status:**
- [x] ABHA initiation
- [x] Consent workflow
- [x] Health-information fetch
- [ ] Pact contract tests (need creation)
- [ ] Token caching + refresh (verify)
- [ ] Credential isolation (verify)

**Dependencies:**
- Patients module (consent data)
- Redis module (token caching)
- Audit module (consent logging)

---

### 19. operations-crm

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Occupancy board
- ✅ Housekeeping task creation

**Missing Tests (MEDIUM PRIORITY):**
- [ ] Bed occupancy analytics correctness
- [ ] Staff rostering accuracy
- [ ] Department P&L tracking
- [ ] Insurance pre-auth tracking
- [ ] Consumables management

**Test Gaps:**
```
TC-IPD-009: OT analytics under cancellations
  - Create/cancel/perform OT bookings
  - Verify: OT utilization, surgeon throughput correct

TC-OPS-001: Bed occupancy analytics
  - Track bed state transitions
  - Query occupancy analytics
  - Assert: accuracy vs. actual transitions
```

**Module Implementation Status:**
- [x] Occupancy board endpoint
- [x] Housekeeping task creation
- [ ] Analytics accuracy (may need enhancement)
- [ ] Staff rostering (may need)
- [ ] Department P&L (may need)
- [ ] Consumables management (may need)

**Dependencies:**
- Room module (bed state)
- Reports module (analytics)
- Audit module (state transition logging)

---

### 20. gateway

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Swagger documentation

**Missing Tests (HIGH PRIORITY):**
- [ ] HTTPS-only enforcement + redirect
- [ ] CORS allowlist (no wildcard)
- [ ] Rate limiting (login, OTP, global)
- [ ] CSP, HSTS, X-Frame-Options headers
- [ ] CORS preflight handling

**Test Gaps:**
```
TC-SEC-007: HTTPS-only redirect
  - Send HTTP request to LB
  - Assert: 301/302 redirect to HTTPS, no content served

TC-SEC-008: CORS allowlist
  - Send request from unknown origin
  - Assert: blocked, no Access-Control-Allow-Origin header

TC-SEC-009: Helmet headers
  - Inspect response headers
  - Assert: CSP, HSTS, X-Frame-Options present + correct
```

**Module Implementation Status:**
- [x] Gateway module with Helmet
- [x] CORS configuration
- [ ] HTTPS redirect (verify at LB level)
- [ ] Rate limiting guard (verify completeness)

**Dependencies:**
- @nestjs/throttler (rate limiting)
- helmet (security headers)

---

### 21. redis

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Session storage
- ✅ Cache operations
- ✅ Queue consumer

**Missing Tests (MEDIUM PRIORITY):**
- [ ] Token caching (ABDM)
- [ ] Cache invalidation correctness
- [ ] Memory usage under load

**Test Gaps:**
```
TC-RES-001: Redis unavailable
  - Redis connection drops
  - System gracefully degrades
  - Assert: clear error, fallback behavior, no silent data loss
```

**Module Implementation Status:**
- [x] Redis service
- [x] Session storage
- [x] Cache wrapper
- [ ] Graceful degradation on Redis failure (may need)

**Dependencies:**
- ioredis (client)
- auth module (session storage)

---

### 22. queue

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ Job enqueueing
- ✅ Job processing

**Missing Tests (MEDIUM PRIORITY):**
- [ ] FHIR/NHCX job idempotency (no duplicates on retry)
- [ ] Job queue monitoring
- [ ] Concurrent job processing correctness
- [ ] Failed job retry + DLQ handling

**Test Gaps:**
```
TC-RES-003: Worker restart during FHIR/NHCX jobs
  - Job in-progress, worker restarts
  - Job resumes on new worker
  - Assert: idempotent, no duplicate bundle/claim publish

TC-LOAD-004: Face match queue load
  - Spike of face match requests
  - Queue manages backlog
  - Assert: queue lag <30s, no timeouts
```

**Module Implementation Status:**
- [x] BullMQ queue service
- [x] Job enqueueing
- [x] Job processing (workers)
- [ ] Idempotency guarantees (may need enhancement)
- [ ] DLQ + retry logic (verify)

**Dependencies:**
- Redis module (queue storage)
- BullMQ (queue processor)

---

### 23. audit

**Status:** ✅ Module exists (in codebase)

**Current Test Coverage:**
- [ ] None found in current report (may exist, not exposed)

**Missing Tests (HIGH PRIORITY):**
- [ ] Database-level RLS enforcement
- [ ] Audit completeness (all writes tracked)
- [ ] Audit retention policy (7-year ILM)
- [ ] Audit export performance
- [ ] Audit encryption (if applicable)

**Test Gaps:**
```
TC-SEC-001: RLS enforcement
  - Attempt cross-facility query via direct SQL
  - Assert: blocked, no facility leakage

TC-SEC-017: Audit completeness
  - Create, update, delete operations
  - Verify: audit record created for each
  - Assert: attributable to user, timestamp, action

TC-SEC-018: Retention policy
  - Verify: 7-year ILM configured
  - Test: old audit records archived/deleted per policy
```

**Module Implementation Status:**
- [x] Audit entity
- [ ] RLS policy enforcement (verify)
- [ ] Audit decorator for automatic logging (may need)
- [ ] Retention policy + ILM (may need)
- [ ] Export endpoint (may need)

**Dependencies:**
- TypeORM (audit table)
- Database policy engine (RLS)

---

### 24. users

**Status:** ✅ Module exists

**Current Test Coverage:**
- ✅ User CRUD
- ✅ Role assignment
- ✅ Permission checks

**Missing Tests (MEDIUM PRIORITY):**
- [ ] RBAC enforcement per endpoint
- [ ] Facility scoping (user can only access own facility)
- [ ] Role inheritance correctness

**Test Gaps:**
```
TC-SEC-002 (part): Discount application authority
  - Unauthorized role attempts discount
  - Assert: 403 Forbidden, no financial mutation

TC-users-001: Facility scoping
  - User from Facility A attempts to access Facility B patient
  - Assert: 403 Forbidden (or RLS filters out data)
```

**Module Implementation Status:**
- [x] User entity with roles
- [x] Role entity
- [x] Permission checking
- [ ] Facility scoping enforcement (verify at all layers)
- [ ] RBAC guards on sensitive endpoints (may need enhancement)

**Dependencies:**
- Auth module (authentication)
- Audit module (action logging)

---

### 25. common

**Status:** ✅ Module exists

**Current Test Coverage:**
- [x] Error handling, decorators, guards

**Missing Tests (MEDIUM PRIORITY):**
- [ ] XSS prevention effectiveness
- [ ] SQL injection prevention
- [ ] Input validation completeness

**Test Gaps:**
```
TC-XSS-001: Already exists in patients-xss.spec.ts
  - Verify all endpoints protected
```

**Module Implementation Status:**
- [x] Global error handler
- [x] Request validation pipes
- [x] Guards (JWT, Roles, Facility)
- [x] Interceptors (transform, logging)
- [ ] Input sanitization (verify comprehensive)

---

## Testing Infrastructure Setup Checklist

### Tools to Install

- [ ] k6 (load testing): `npm install --save-dev k6`
- [ ] @pact-foundation/pact (contract testing): `npm install --save-dev @pact-foundation/pact`
- [ ] FHIR validator: `npm install --save-dev @hapifhir/hapi-fhir-validator` or similar
- [ ] Playwright (browser testing): `npm install --save-dev @playwright/test`
- [ ] WireMock (service mocking): `npm install --save-dev @wiremock/jest-extension`

### Test Fixtures to Create

- [ ] `test/fixtures/patients.ts` - 50+ sample patients
- [ ] `test/fixtures/facilities.ts` - multi-facility data
- [ ] `test/fixtures/users.ts` - users per role
- [ ] `test/fixtures/rooms.ts` - 20+ rooms with states
- [ ] `test/seed.ts` - database seeding
- [ ] `test/cleanup.ts` - transactional cleanup

### CI/CD Integration

- [ ] GitHub Actions: E2E on every push
- [ ] Nightly load tests
- [ ] Weekly soak tests
- [ ] Pact broker integration
- [ ] Coverage reporting to CodeCov

---

**Last Updated:** 2026-04-14  
**Document Version:** 1.0
