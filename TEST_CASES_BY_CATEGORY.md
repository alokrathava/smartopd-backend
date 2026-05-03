# SmartOPD Test Cases Reference — By Category

This document provides the complete test case inventory organized by testing category, with module dependencies and implementation sequence.

---

## Category A: Staged End-to-End Clinical Journeys (TC-E2E-001 to TC-E2E-012)

**Priority:** PHASE 1 (Weeks 1-2) — **CRITICAL for certification**

These test cases prove that a patient can flow through the entire OPD system from identity through CRM with continuous context and traceable audit.

### TC-E2E-001: Returning OPD Patient via Face Recognition

**Test Name:** `face_recognition_opd_journey`  
**File:** `test/e2e/16-staged-opd.e2e-spec.ts`

**Modules Involved:**
- `patients` (face lookup)
- `auth` (identity resolution)
- `visits` (visit creation)
- `queue` (queue management)
- `nurse` (vitals entry)
- `doctor` (consultation)
- `pharmacy` (prescription, dispense)
- `payment` (billing)
- `crm` (post-visit follow-up)
- `audit` (complete trace)

**Entry State:**
```
- Patient enrolled with face embedding (50k-patient corpus)
- Multiple prior visits in system
- Doctor, nurse, pharmacist available
- OPD facility operational
```

**Steps:**
1. Kiosk/reception: face capture → face match against corpus
2. System resolves patient identity → retrieves prior history, ABDM context
3. Create visit with doctor assignment
4. Nurse: enter vitals (BP, temp, pulse, resp rate)
5. Doctor: record consultation, medications, referrals
6. Doctor: sign-off consultation (triggers FHIR publish + ABDM M3 notification)
7. Pharmacy: dispense medication to patient
8. Payment: patient pays (split cash + UPI)
9. CRM: system schedules follow-up or campaign

**Exit State:**
```
- Single patient context throughout
- Visit record with all metadata
- Prescription fulfilled and dispensed
- Bill paid and reconciled
- CRM follow-up scheduled
- Audit trail: 15+ entries (identity resolve, visit create, vitals, consultation, prescription, dispense, payment, CRM action)
```

**Assertions:**
```
✓ Patient ID is same from face match through CRM action
✓ Visit ID is unique and present in all downstream records
✓ Audit table has entries for: face match, identity resolve, visit create, vitals create, consultation save, sign-off, prescription create, dispense, payment, CRM action
✓ No duplicate visit or patient records created
✓ ABDM M3 notification sent (can verify via ABDM sandbox mock)
✓ CRM profile has follow-up scheduled with correct date
✓ Bill totals match pharmacy + service charges
```

**Expected Duration:** <5 seconds  
**Dependencies:** Staging DB with 50k face embeddings, ABDM sandbox mock, mail mock

---

### TC-E2E-002: Returning OPD Patient via OTP Fallback

**Test Name:** `otp_fallback_opd_journey`  
**File:** `test/e2e/16-staged-opd.e2e-spec.ts`

**Modules Involved:** Same as TC-E2E-001, but via OTP auth path

**Entry State:**
- Same patient as TC-E2E-001, face enrollment intact
- OTP gateway mocked to succeed

**Steps:**
1. Kiosk/reception: face capture → face match fails (intentionally, or corpus doesn't contain face)
2. System falls back to OTP
3. OTP sent to patient phone
4. Patient enters OTP (mocked to accept)
5. System resolves patient identity (same as face match would)
6. Rest of workflow identical to TC-E2E-001

**Assertions:**
```
✓ Face match failure triggers OTP fallback
✓ Identity resolved to same patient via OTP
✓ Downstream workflow identical (visit, vitals, consultation, dispense, payment, CRM)
✓ Audit trace shows OTP path, not face match
✓ Bill and CRM state identical to face path
```

**Expected Duration:** <5 seconds  
**Notes:** Ensures robustness of identity resolution; proves two-path continuity

---

### TC-E2E-003: New Patient Registration with Consent

**Test Name:** `new_patient_consent_enrollment`  
**File:** `test/e2e/16-staged-opd.e2e-spec.ts`

**Modules Involved:**
- `patients` (new patient creation)
- `consent` (DPDP consent flow)
- `auth` (identity, face enrollment trigger)

**Entry State:**
- New patient (not in system)
- Face not enrolled
- No ABHA/consent records

**Steps:**
1. Reception: create patient record (basic info: name, DOB, phone)
2. System prompts for consent (DPDP disclosure + biometric consent)
3. Patient reviews and accepts consent
4. System triggers face enrollment (only if consent accepted)
5. Face capture and embedding stored
6. Patient assigned OTP as fallback
7. Verify patient can now proceed to visit creation

**Assertions:**
```
✓ Patient creation requires consent prompt
✓ Face enrollment blocked if consent not accepted
✓ Consent record in audit + patient table
✓ Face embedding only exists after consent + enrollment
✓ Patient can create visit after enrollment
✓ DPDP consent record retrievable for audit
```

**Expected Duration:** <3 seconds  
**Dependencies:** Consent form validation, face embedding library

---

### TC-E2E-004: Doctor Consultation to Pharmacy Handoff

**Test Name:** `doctor_to_pharmacy_handoff`  
**File:** `test/e2e/16-staged-opd.e2e-spec.ts`

**Modules Involved:**
- `doctor` (consultation, prescription)
- `pharmacy` (dispense queue)
- `queue` (task routing)

**Entry State:**
- Patient checked in, vitals recorded, in doctor queue
- Doctor available

**Steps:**
1. Doctor: open patient consultation form
2. Doctor: record diagnosis, select medications from formulary
3. Doctor: add dosage, duration, special instructions
4. Doctor: submit consultation (prescription created)
5. System: move prescription to pharmacy queue (no manual handoff)
6. Pharmacist: open app → sees new prescription in queue automatically
7. Pharmacist: view prescription details (diagnosis, patient, medications)
8. Pharmacist: dispense and issue to patient

**Assertions:**
```
✓ Prescription created and linked to consultation
✓ Pharmacy queue updated immediately after submission
✓ Pharmacist sees prescription without polling/refresh
✓ Prescription visible to pharmacist within <1 second of doctor submission
✓ No manual queue entry needed
✓ Audit: doctor submit → pharmacy queue entry created
```

**Expected Duration:** <2 seconds  
**Notes:** Tests real-time queue management; verifies no paper/email handoff needed

---

### TC-E2E-005: Pharmacy Pickup by Patient Face/OTP Verification

**Test Name:** `pharmacy_pickup_verification`  
**File:** `test/e2e/16-staged-opd.e2e-spec.ts`

**Modules Involved:**
- `pharmacy` (dispense logic)
- `patients` (face/OTP verification)
- `auth` (identity verification)
- `audit` (staff + action logging)

**Entry State:**
- Prescription ready for pickup
- Patient at pharmacy counter
- Pharmacy staff logged in

**Steps:**

**Path 1: Face Verification**
1. Pharmacist: initiate pickup verification
2. Patient: face capture at pharmacy kiosk
3. System: match against stored embedding
4. System: display medication details for confirmation
5. Patient: confirm receipt
6. Pharmacist: physically hand over medication
7. System: record dispense (staff, timestamp, batch number)

**Path 2: OTP Verification**
1. Pharmacist: initiate pickup verification
2. System: send OTP to patient phone
3. Patient: enter OTP on kiosk
4. System: verify OTP, display medication details
5. Patient: confirm receipt
6. Pharmacist: dispense medication
7. System: record dispense

**Assertions (Face):**
```
✓ Face match successful (same patient from earlier identity)
✓ Medication details correct
✓ Dispense record includes: staff ID, patient ID, medication, quantity, batch, timestamp
✓ Audit entry: "pharmacy_dispense_face_verified"
✓ Patient name and prior visits displayed to pharmacist
```

**Assertions (OTP):**
```
✓ OTP sent to correct phone number
✓ OTP entry leads to same dispense workflow
✓ Audit entry: "pharmacy_dispense_otp_verified"
✓ Dispense record identical format to face path
```

**Expected Duration:** <3 seconds  
**Dependencies:** Face matching at pharmacy, OTP gateway mock

---

### TC-E2E-006: Family Pickup OTP Workflow

**Test Name:** `family_member_pickup_otp`  
**File:** `test/e2e/16-staged-opd.e2e-spec.ts`

**Modules Involved:**
- `pharmacy` (family pickup flag)
- `patients` (family member identity)
- `auth` (OTP for family)

**Entry State:**
- Prescription issued with "family pickup allowed" flag
- Family member phone number on file

**Steps:**
1. Doctor: when issuing prescription, mark "family member allowed"
2. Doctor: specify family member name and phone
3. System: generate family-pickup OTP link (SMS + email)
4. Family member: click link or enter OTP
5. System: verify OTP, display medication + patient name
6. Family member: confirm pickup
7. Pharmacist: dispense to family member (different person from patient)
8. System: record dispense with "family member" flag + name

**Assertions:**
```
✓ Family pickup flag set during prescription creation
✓ OTP sent to family phone, not patient phone
✓ Dispense marked as "family pickup" in audit
✓ Family member name recorded in dispense record
✓ Patient + family member both logged in audit trail
✓ Pharmacy history shows "picked up by: [family name]"
```

**Expected Duration:** <2 seconds  
**Notes:** Proves family workflow is controlled and traceable; not anonymous or high-risk

---

### TC-E2E-007: Allergy/Interactions Blocking Path

**Test Name:** `allergy_interaction_block_prescription`  
**File:** `test/e2e/16-staged-opd.e2e-spec.ts`

**Modules Involved:**
- `patients` (allergy record)
- `nurse` (allergy intake during triage)
- `doctor` (prescription creation with drug interaction check)
- `pharmacy` (dispense decision)

**Entry State:**
- Patient with known penicillin allergy
- Doctor not yet aware of allergy

**Steps:**
1. Nurse: during triage, ask about allergies → patient reports penicillin allergy
2. Nurse: record allergy in system (audit: "allergy_recorded")
3. Doctor: review patient context → allergy visible in sidebar
4. Doctor: attempt to prescribe amoxicillin (penicillin-class)
5. System: warn "INTERACTION: penicillin allergy detected"
6. Doctor: override the warning (must provide reason)
7. System: record override in audit (patient safety + legal accountability)
8. Prescription submitted with override flag

**Assertions:**
```
✓ Allergy visible to doctor during consultation
✓ Drug-allergy interaction detected automatically
✓ Warning blocks prescription submission (user must interact)
✓ Override requires free-text reason
✓ Audit: allergy, interaction warning, override reason, doctor name, timestamp
✓ Pharmacist sees interaction warning + override reason before dispensing
✓ Pharmacist can accept or reject override (pharmacy policy)
```

**Expected Duration:** <2 seconds  
**Notes:** Critical for patient safety; tests multi-stakeholder decision point

---

### TC-E2E-008: Consultation Triggers NHCX Claim Initiation

**Test Name:** `consultation_triggers_nhcx_claim`  
**File:** `test/e2e/16-staged-opd.e2e-spec.ts`

**Modules Involved:**
- `doctor` (consultation)
- `payment` (bill + insurance context)
- `nhcx` (claim submission job)
- `fhir` (claim bundle)
- `audit` (claim trace)

**Entry State:**
- Patient with active insurance coverage (TPA/private insurance)
- Covered for OPD consultation
- Doctor, insurance details linked

**Steps:**
1. Doctor: record consultation (diagnosis, procedures)
2. Doctor: sign off consultation
3. System: create bill with insurance coverage
4. System: trigger NHCX claim job (async)
5. Claim job: generate FHIR bundle for claim
6. Claim job: submit to NHCX (mock/sandbox)
7. Claim job: record claim ID + status in Bill aggregate
8. System: wait for approval webhook (mocked)
9. Approval received: Bill updated with approved amount

**Assertions:**
```
✓ Bill created with insurance coverage reference
✓ Claim job triggered automatically after bill creation
✓ FHIR bundle generated correctly (Claim resource type)
✓ NHCX claim ID recorded in Bill table
✓ Claim status = "submitted"
✓ Audit: claim submission, FHIR bundle content, NHCX response
✓ Approval webhook updates Bill.approved_amount + status = "approved"
✓ Bill reconciliation: billed amount ≤ approved amount
```

**Expected Duration:** <5 seconds (including async job)  
**Dependencies:** NHCX sandbox mock, claim job infrastructure, FHIR bundle builder

---

### TC-E2E-009: Post-Visit CRM Automation

**Test Name:** `postvisit_crm_automation`  
**File:** `test/e2e/16-staged-opd.e2e-spec.ts`

**Modules Involved:**
- `visits` (visit completion)
- `crm` (patient profile, campaign logic)
- `notification` (reminder scheduling)

**Entry State:**
- Completed visit
- Patient with chronic disease (e.g., diabetes)
- CRM rules configured for follow-up

**Steps:**
1. Visit completed (consultation signed off, payment done)
2. System: evaluate CRM rules for patient profile
3. Rule matches: "chronic patient → follow-up in 30 days"
4. System: create CRM task (follow-up reminder)
5. System: schedule notification for day 28 (reminder 2 days before)
6. Verify CRM profile updated with follow-up date
7. Verify reminder scheduled in notification queue

**Assertions:**
```
✓ Visit marked as completed
✓ CRM profile evaluated (patient type, disease, prior visits)
✓ Follow-up rule triggered
✓ CRM task created with correct date
✓ Notification scheduled (type: reminder, recipient: patient phone)
✓ Audit: CRM rule evaluation, task creation, notification scheduling
```

**Expected Duration:** <2 seconds  
**Notes:** Tests automation; ensures no manual CRM data entry needed

---

### TC-E2E-010: Consultation-Triggered Equipment Lease

**Test Name:** `consultation_equipment_lease_flow`  
**File:** `test/e2e/16-staged-opd.e2e-spec.ts`

**Modules Involved:**
- `doctor` (consultation, equipment order)
- `equipment` (lease lifecycle)
- `payment` (lease deposit + rental charges)
- `crm` (patient profile, reminder setup)
- `audit` (clinical origin trace)

**Entry State:**
- Patient diagnosed with condition requiring equipment (e.g., mobility aid)
- Equipment available in facility inventory
- Doctor authorized to issue leases

**Steps:**
1. Doctor: during consultation, determine patient needs equipment
2. Doctor: create equipment order (type, quantity, duration estimate)
3. System: create lease record with clinical origin (consultation ID)
4. System: calculate deposit (e.g., 50% of 3-month rental cost)
5. Billing: add lease deposit to patient bill
6. Patient: pays bill (including deposit)
7. System: issue equipment to patient
8. System: schedule return reminder (e.g., 89 days out)
9. CRM: add follow-up task for lease return inspection

**Assertions:**
```
✓ Lease linked to consultation (clinical origin)
✓ Lease ID, deposit amount, rental terms captured
✓ Bill includes lease deposit charge
✓ Payment recorded against lease
✓ Equipment issue record created (timestamp, staff, patient)
✓ Return reminder scheduled
✓ CRM profile has lease return task
✓ Audit: order creation, lease issue, deposit payment, reminder scheduling
```

**Expected Duration:** <3 seconds  
**Notes:** Tests integration of clinical, financial, and operational workflows

---

### TC-E2E-011: Lab Order Routing

**Test Name:** `lab_order_routing_callback`  
**File:** `test/e2e/16-staged-opd.e2e-spec.ts`

**Modules Involved:**
- `doctor` (lab order placement)
- `lab` (order queue, partner integration)
- `queue` (order management)
- `visits` (order context)
- `audit` (order trace)

**Entry State:**
- Patient in consultation
- Lab partner integrated (e.g., pathology lab)
- Doctor authorized to order labs

**Steps:**
1. Doctor: record consultation findings
2. Doctor: add lab order (test type: CBC, blood sugar, etc.)
3. System: create lab order record + route to partner (SMS/API)
4. Lab partner: receives order → processes sample
5. Lab partner: result ready → call callback endpoint (mock)
6. System: receive result callback → parse + store in visit context
7. Doctor: can view lab result in patient dashboard
8. Doctor: use result in diagnosis/treatment plan

**Assertions:**
```
✓ Lab order created with consultation reference
✓ Order routed to external lab partner
✓ Audit: order creation, partner notification
✓ Callback received and parsed correctly
✓ Result attached to patient/visit context
✓ Result visible in doctor's dashboard within <2s of callback
✓ Audit: result received, timestamp, test values
```

**Expected Duration:** <3 seconds  
**Dependencies:** Lab partner mock API, callback handler

---

### TC-E2E-012: Visit Cancel / Abort / Recovery

**Test Name:** `visit_cancel_abort_recovery`  
**File:** `test/e2e/16-staged-opd.e2e-spec.ts`

**Modules Involved:**
- `visits` (state transitions)
- `queue` (queue cleanup)
- `payment` (bill nullification if needed)
- `audit` (cancellation trace)
- `notification` (cancellation alert)

**Entry State:**
- Visit in progress at different stages

**Scenarios:**
1. **Cancel Before Consultation:** Patient arrives, vitals taken, but cancels before doctor sees them
2. **Cancel After Triage:** Patient cancels after nurse triage, before doctor consultation
3. **System Failure Recovery:** Mid-consultation, system crashes; recovery workflow

**Steps (Scenario 1):**
1. Patient enters visit (vitals recorded, in queue)
2. Patient decides to leave
3. Receptionist: mark visit as cancelled
4. System: remove from queue, release doctor slot
5. Bill: if no charges yet, leave as $0; if charged, initiate refund
6. CRM: cancel any scheduled follow-ups
7. Notification: alert patient of cancellation + option to reschedule

**Steps (Scenario 2):**
1. Patient through triage (vitals recorded)
2. Patient cancels before doctor consultation
3. Receptionist: cancel visit
4. System: clean up vitals records? Or keep for history? (Policy decision)
5. Bill: cancel any pre-charges
6. Queue: remove from doctor queue

**Steps (Scenario 3):**
1. Doctor signs off consultation, system crashes before bill creation
2. On recovery, system detects incomplete visit
3. Doctor: re-open visit (recovery path)
4. Doctor: confirm consultation was complete (no re-entry needed)
5. System: complete bill + prescription creation
6. Resume normal workflow

**Assertions:**
```
✓ Visit status transitions correctly (active → cancelled)
✓ Queue entries removed
✓ Bill refunds processed (if applicable)
✓ CRM follow-ups cancelled
✓ No orphan records (vitals without visit, etc.)
✓ No duplicate billing (system robust against crash)
✓ Audit: cancellation reason, timestamp, authorizing user
✓ Recovery path re-completes visit without creating duplicates
```

**Expected Duration:** <2 seconds  
**Notes:** Critical for system stability; tests state machine + crash recovery

---

## Category B: Inpatient & Hospital Workflows (TC-IPD-001 to TC-IPD-010)

**Priority:** PHASE 2 (Weeks 3-4) — **Critical for hospital system**

These test cases prove that a patient can be admitted, managed through inpatient stay, and discharged with full continuity and bed management.

### TC-IPD-001: Admission from OPD

**Test Name:** `admission_from_opd_conversion`

**Modules Involved:**
- `visits` (OPD visit context)
- `admission` (admission creation)
- `room` (bed assignment)
- `payment` (inpatient billing context)

**Entry State:**
- Active OPD visit (consultation complete, diagnosis recorded)
- Doctor decides patient needs inpatient care
- Bed available

**Steps:**
1. Doctor: during consultation, decide on admission
2. Doctor: submit admission request
3. System: convert OPD visit → inpatient admission
4. System: assign bed from available pool
5. Admission: link to prior OPD visit (single patient context)
6. Payment: switch to inpatient billing mode (per-day charges, room rate, etc.)
7. Nursing: receive admission notification → begin inpatient care plan

**Assertions:**
```
✓ Admission created from OPD visit
✓ Patient ID maintained (no duplication)
✓ Admission linked to OPD visit for history
✓ Bed assigned and occupancy board updated
✓ Diagnosis from OPD consultation visible in admission
✓ Doctor assignment transferred to admission
✓ Billing context switched to inpatient (daily rates)
✓ Audit: OPD→IPD conversion, bed assignment, billing mode change
```

**Expected Duration:** <2 seconds

---

### TC-IPD-002: Admission from Emergency Path

**Test Name:** `admission_from_emergency_no_opd`

**Modules Involved:**
- `admission` (direct admission)
- `room` (bed assignment)
- `patients` (may be new or existing)
- `audit` (emergency admission trace)

**Entry State:**
- New patient, or existing patient not in current visit
- Emergency condition
- Bed available
- Doctor/nurse available for intake

**Steps:**
1. Emergency triage: patient brought in acutely
2. Nurse: take vitals, assess
3. Doctor: examine, diagnose, admit
4. System: create admission record (no OPD visit)
5. System: assign bed
6. System: initiate emergency admission billing
7. System: notify ICU/ward team

**Assertions:**
```
✓ Admission created without prior OPD visit
✓ Patient ID resolved (new or existing)
✓ Admission marked as "emergency"
✓ Bed assigned immediately
✓ Vitals from triage linked to admission
✓ Doctor examination/diagnosis recorded
✓ Audit: emergency admission, urgency level, triage vitals
```

**Expected Duration:** <2 seconds

---

### TC-IPD-003: Transfer Between Beds/Rooms

**Test Name:** `patient_transfer_bed_to_bed`

**Modules Involved:**
- `admission` (admission record update)
- `room` (bed assignment change)
- `operations-crm` (occupancy board)
- `audit` (transfer trace)

**Entry State:**
- Patient admitted in standard ward bed
- Condition deteriorates or improves → needs ICU or private room
- Target bed available

**Steps:**
1. Doctor: assess patient → decide on transfer
2. Doctor: initiate transfer request
3. System: check target bed availability
4. System: release current bed
5. System: assign patient to new bed
6. System: move admission bed assignment
7. System: update occupancy board (old bed → cleaning, new bed → occupied)
8. Nursing: get transfer alert
9. Nursing: receive patient in new location

**Assertions:**
```
✓ Current bed state changes to "being_cleaned"
✓ New bed state changes to "occupied"
✓ Occupancy board shows both changes immediately
✓ Patient admission record updated with new bed
✓ Transfer record created (from bed, to bed, reason, timestamp)
✓ Nursing alerts sent to both old and new ward teams
✓ Audit: transfer initiation, bed release, new bed assignment
```

**Expected Duration:** <1 second

---

### TC-IPD-004: Discharge and Bed Turnaround

**Test Name:** `patient_discharge_bed_turnaround`

**Modules Involved:**
- `admission` (discharge process)
- `room` (bed state management)
- `payment` (final bill, settlement)
- `operations-crm` (occupancy, housekeeping SLA)
- `audit` (discharge trace)

**Entry State:**
- Patient in admission (admitted for 2-3 days simulated)
- Doctor authorizes discharge
- Final bill ready

**Steps:**
1. Doctor: complete discharge summary (SOAP note, follow-up plan)
2. Doctor: authorize discharge
3. System: finalize bill (all charges, medications, procedures)
4. Payment: patient settles bill (cash/insurance/mixed)
5. System: release bed → state = "cleaning"
6. Housekeeping: receive cleaning task (SLA: complete in 2 hours)
7. Housekeeping: mark bed as cleaned
8. System: bed state = "available"
9. Occupancy board: bed available for next admission

**Assertions:**
```
✓ Discharge summary complete (allergies, diagnosis, medications, follow-up)
✓ Bed released immediately after discharge
✓ Bill finalized with all charges
✓ Payment processed and reconciled
✓ Housekeeping task created with SLA timer
✓ Occupancy board updates: occupied → cleaning → available
✓ Audit: discharge summary content, payment, bed release, housekeeping SLA
```

**Expected Duration:** <2 seconds

---

### TC-IPD-005: Bedside Medication via QR Wristband

**Test Name:** `bedside_medication_qr_wristband`

**Modules Involved:**
- `patients` (patient identity via QR)
- `admission` (bedside context)
- `nurse` (MAR entry)
- `pharmacy` (medication verification)
- `audit` (bedside action trace)

**Entry State:**
- Patient admitted, wristband with QR code
- MAR (Medication Administration Record) created
- Medication delivered to bedside

**Steps:**
1. Nurse: approach bedside with medication
2. Nurse: scan patient QR wristband
3. System: resolve patient identity
4. System: display medication details (name, dose, indication)
5. Nurse: verify matches prescription
6. Nurse: administer medication
7. Nurse: confirm administration on MAR
8. System: record timestamp, nurse ID, medication, patient

**Assertions:**
```
✓ QR scan resolves correct patient
✓ Medication details match prescription
✓ No patient identity confusion (correct patient, correct drug, correct dose)
✓ MAR entry records: patient, nurse, medication, timestamp
✓ Audit: QR scan, patient resolution, MAR entry
✓ Pharmacist can verify medication was dispensed via MAR
```

**Expected Duration:** <1 second  
**Notes:** Critical for inpatient safety; reduces manual identity errors

---

### TC-IPD-006: Ward Round Stop Entry

**Test Name:** `ward_round_stop_entry`

**Modules Involved:**
- `admission` (ward round context)
- `doctor` (stop entry form)
- `nurse` (care plan updates)
- `queue` (task generation for new orders)
- `audit` (ward round trace)

**Entry State:**
- Doctor conducting ward round (scheduled visit to multiple patients)
- Patient has active admission
- Prior SOAP notes exist

**Steps:**
1. Doctor: open patient in ward round module
2. Doctor: review prior notes, vitals, labs
3. Doctor: enter SOAP note (Subjective: patient report, Objective: exam findings, Assessment: diagnosis, Plan: next steps)
4. Doctor: issue new orders (medications, tests, procedures)
5. Doctor: update estimated discharge date
6. System: generate nursing tasks from new orders
7. System: schedule follow-up assessments as needed
8. Doctor: submit ward round stop

**Assertions:**
```
✓ SOAP note recorded with full content
✓ New orders create nursing tasks (visible in nurse queue)
✓ Discharge estimate updated
✓ Audit: ward round date, doctor, SOAP content, orders issued
✓ Handover summary can be generated from ward round notes
✓ Nursing tasks appear in queue immediately after stop submission
```

**Expected Duration:** <1 second

---

### TC-IPD-007: OT Booking with Pre-Op Checklist Block

**Test Name:** `ot_preop_checklist_block`

**Modules Involved:**
- `ot` (OT booking)
- `admission` (surgical admission context)
- `nurse` (pre-op checklist completion)

**Entry State:**
- Patient admitted, surgery scheduled
- OT booking created
- Pre-op checklist defined (e.g., NPO status verified, consent form signed, labs done, etc.)

**Steps:**
1. Doctor: create OT booking (date, time, surgical procedure, duration estimate)
2. System: generate pre-op checklist
3. Nurse: work through checklist items (verify NPO, review labs, confirm consent, etc.)
4. At scheduled time: OT staff prepare to start surgery
5. Nurse: attempt to mark surgery as "start"
6. System: check pre-op checklist completion
7. One item incomplete: checklist blocks surgery start
8. System: show alert "Critical checklist item incomplete"
9. Nurse/Doctor: address incomplete item
10. Nurse: mark checklist item complete
11. Surgery start is now allowed

**Assertions:**
```
✓ Pre-op checklist generated with required items
✓ Each item must be explicitly marked done
✓ Incomplete checklist blocks surgery start (hard stop)
✓ Alert shows which item is incomplete
✓ Once completed, surgery start is allowed
✓ Audit: checklist creation, completion, attempted start, block, resolution
```

**Expected Duration:** <1 second

---

### TC-IPD-008: OT with Post-Op Bed Reservation

**Test Name:** `ot_postop_bed_reservation`

**Modules Involved:**
- `ot` (OT booking)
- `room` (bed availability)
- `admission` (bed assignment)

**Entry State:**
- OT booking created for surgery
- Patient needs post-op bed reservation

**Steps:**
1. Doctor: create OT booking
2. System: check post-op bed availability for expected duration (e.g., 12-24 hours)
3. **Scenario A:** Post-op bed available → reserve bed, allow OT booking
4. **Scenario B:** Post-op bed not available → flag warning or block booking

**Assertions (Scenario A):**
```
✓ OT booking has post-op bed reserved
✓ Post-op bed state = "reserved_for_post_op"
✓ Occupancy board shows reservation
✓ Booking proceeds
```

**Assertions (Scenario B):**
```
✓ System warns "no post-op bed available"
✓ Offers alternatives (reschedule OT, use different ward, etc.)
✓ Booking can proceed with explicit override + reason
✓ Audit: bed availability warning, override decision
```

**Expected Duration:** <1 second

---

### TC-IPD-009: OT Cancellation / Postponement Analytics Integrity

**Test Name:** `ot_cancellation_analytics`

**Modules Involved:**
- `ot` (OT cancellation)
- `room` (bed release)
- `reports` (analytics queries)
- `operations-crm` (OT utilization, surgeon throughput)

**Entry State:**
- OT booking exists, possibly in progress
- Analytics dashboards track OT utilization, surgeon throughput, cancellation rates

**Steps:**
1. Doctor: decide to postpone OT (e.g., patient condition changed)
2. System: cancel OT booking
3. System: release reserved beds
4. System: record cancellation reason
5. System: update surgeon's throughput metrics
6. Verify analytics remain correct: cancellation count, OT utilization, surgeon stats

**Assertions:**
```
✓ OT booking cancelled with reason recorded
✓ Reserved beds released and available again
✓ Analytics: cancellation count incremented
✓ Surgeon's OT stat doesn't count cancelled booking as performed
✓ OT utilization metric corrected (available hours increases)
✓ Audit: cancellation date, reason, beds released
✓ Reports show accurate OT throughput (planned ≠ actual)
```

**Expected Duration:** <1 second

---

### TC-IPD-010: Admission-Triggered Insurance Pre-Auth

**Test Name:** `admission_insurance_preauth`

**Modules Involved:**
- `admission` (admission with insurance flag)
- `payment` (pre-auth request)
- `nhcx` (insurer integration)
- `audit` (pre-auth trace)

**Entry State:**
- Patient admitted with insurance coverage
- Insurance requires pre-auth for inpatient care (some policies do)
- Insurer API available (mocked)

**Steps:**
1. Admission created with insurance reference
2. System: detect pre-auth required (based on policy)
3. System: send pre-auth request to insurer
4. Insurer: evaluates → approves or denies
5. System: receive approval response
6. Admission: update with pre-auth status + approved amount
7. Billing: use pre-auth approved amount as bill cap

**Assertions:**
```
✓ Pre-auth request sent to insurer automatically
✓ Pre-auth ID recorded in admission
✓ Approval/denial response received
✓ Admission linked to pre-auth record
✓ Bill cap enforced (can't bill beyond approved)
✓ Audit: pre-auth request, response, approval date, approved amount
✓ Pre-auth status visible in admission + billing dashboards
```

**Expected Duration:** <2 seconds (including insurer mock latency)

---

## Category C: Revenue & Compliance Tests

**Priority:** PHASE 3 (Weeks 5-6)

This section continues with **TC-REV-001 to TC-REV-005** and **TC-SEC-001 to TC-SEC-018**.  
See main TEST_MATURITY_PLAN.md for full details.

---

## Category D: ABDM/FHIR/NHCX Contracts

**Priority:** PHASE 4 (Weeks 7-8)

**TC-ABDM-001 to TC-ABDM-010** (Pact contracts)  
**TC-FHIR-001 to TC-FHIR-005** (Bundle validation)  
**TC-NHCX-001 to TC-NHCX-006** (Claim contracts)

See main TEST_MATURITY_PLAN.md for full test case specifications.

---

## Category E: Performance, Load & Stress Tests

**Priority:** PHASE 5 (Weeks 9-10)

**TC-LOAD-001 to TC-LOAD-009** (Load tests against SLA targets)  
**TC-STRESS-001 to TC-STRESS-005** (Stress scenarios)  
**TC-SOAK-001 to TC-SOAK-003** (Sustained load tests)  
**TC-RES-001 to TC-RES-005** (Resilience/failover)

See main TEST_MATURITY_PLAN.md for detailed specifications.

---

## Category F: Mobile/Offline & UI Tests

**Priority:** PHASE 6 (Weeks 11-12)

**TC-UI-001 to TC-UI-009** (Playwright per-role journeys, Espresso, Compose)  
**TC-OFF-001 to TC-OFF-003** (Offline vitals & prescription)  
**TC-LIVE-001** (WebSocket bed board live updates)

See main TEST_MATURITY_PLAN.md for full specifications.

---

## Category G: Endpoint Module Coverage

**Priority:** PHASE 7 (Weeks 13-14)

**Patients endpoints:**
- search, by-id, update, merge, consent-revoke, face-match negative cases
- Test realistic corpus scale (10k, 50k patients)

**ABDM endpoints:**
- initiate-abha, verify-otp, create-address, verify-abha, init-linking, confirm-link, request-consent, abdm-history, care-contexts, publish-fhir, inbound-notify, fetch-health, S3 storage

**Payment/NHCX endpoints:**
- submit-nhcx-claim, nhcx-status, revenue-summary, dhis-dashboard, equipment-util, crm-analytics

**CRM endpoints:**
- patient-profile, LTV-scoring, churn-risk, segment-override, campaign-generation, refill-reminder, lab-result-notify

**Audit endpoints:**
- export, manual-log, write-completeness, retention-policy, large-export-perf

**Operations-CRM endpoints:**
- bed-occupancy-analytics, staff-rostering, dept-P&L, pre-auth-tracking, consumables-mgmt, nightly-heavy-jobs

See main TEST_MATURITY_PLAN.md for full endpoint list.

---

## Test Case Template (Use for New Tests)

```typescript
describe('Test Category (TC-XXX)', () => {
  let db: TypeOrmDataSource;
  let app: INestApplication;

  beforeAll(async () => {
    // Setup database, load fixtures, create app instance
  });

  afterEach(async () => {
    // Transactional cleanup between tests
  });

  describe('TC-XXX-NNN: Test Name', () => {
    it('should [expected outcome]', async () => {
      // ENTRY STATE: setup test data
      const patient = await setupPatient({ /* ... */ });
      const visit = await setupVisit(patient, { /* ... */ });

      // STEPS: execute test flow
      const response = await supertest(app.getHttpServer())
        .post('/endpoint')
        .send({ /* ... */ });

      // ASSERTIONS: verify outcome
      expect(response.status).toBe(200);
      expect(response.body.result).toBeDefined();
      
      // Verify audit trail
      const auditRecords = await db.getRepository(Audit).find({
        where: { entityId: visit.id }
      });
      expect(auditRecords.length).toBeGreaterThan(0);
      expect(auditRecords[0].action).toBe('expected_action');

      // Verify downstream state
      const updatedVisit = await db.getRepository(Visit).findOne(visit.id);
      expect(updatedVisit.status).toBe('expected_status');
    });
  });
});
```

---

**Last Updated:** 2026-04-14  
**Document Version:** 1.0
