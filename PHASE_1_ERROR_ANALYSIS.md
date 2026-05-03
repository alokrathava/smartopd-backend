# Phase 1 Test Failures — Error Analysis & Fix Plan

**Date:** 2026-04-15 (Test run results)  
**Status:** 6 tests failing, 8 passing (placeholders)  
**Action:** Address endpoint/validation issues systematically

---

## Summary of Test Results

```
✅ Passed: 8 tests (all placeholders: TC-E2E-007 to TC-E2E-012)
❌ Failed: 6 tests (actual implementations: TC-E2E-001 to TC-E2E-006)
⏱️  Time: 10.2 seconds
```

---

## Error Analysis by Test Case

### ❌ TC-E2E-001: Returning OPD Patient via Face Recognition

**Error:**
```
[seed.helper] seedPatient failed (HTTP 409):
"A patient with phone number +916000000004 already exists in this facility"
```

**Root Cause:**
- `seedPatient()` is generating duplicate phone numbers
- Shared context persists across tests, but phone generation isn't unique enough

**Fix:**
1. **Option A:** Use timestamps in phone number generation
   ```typescript
   const uniquePhone = () => `9${Date.now() % 1000000000}`;
   ```
2. **Option B:** Clear patient data before each test (transactional cleanup)
3. **Option C:** Generate truly random phone numbers with different range

**Priority:** CRITICAL - blocks first test

**Location:** `test/helpers/seed.helper.ts:uniquePhone()` or test setup

---

### ❌ TC-E2E-002: OTP Fallback Workflow

**Error:**
```
expected 404 to be one of 200,201
Expected endpoint: POST /api/v1/auth/otp/send
```

**Root Cause:**
- Endpoint does not exist OR
- Wrong endpoint path OR
- Wrong HTTP method

**Investigation Needed:**
1. Check `src/auth/auth.controller.ts` for `/otp/send` endpoint
2. Check actual route definition (might be `/otp/request` or `/identity/otp/send`)
3. Check request body requirements

**Fix:**
1. Find correct OTP endpoint in auth controller
2. Update test to use correct path
3. Verify request body matches expected DTO

**Priority:** HIGH - 404 means endpoint missing or wrong path

**Likely Path:** Check if it's:
- `/api/v1/auth/otp/send`
- `/api/v1/identity/otp/send`
- `/api/v1/auth/request-otp`
- `/api/v1/patients/otp/send`

---

### ❌ TC-E2E-003: New Patient Registration with Consent

**Error:**
```
expect(received).toBe(expected)
Expected: 201
Received: 400

Location: Patient creation endpoint
```

**Root Cause:**
- Invalid patient creation request body
- Missing required fields (phone format? dateOfBirth format? gender value?)

**Fix:**
1. Check `src/patients/dtos/create-patient.dto.ts` for required fields
2. Verify field formats:
   - `phone`: Should it be with country code? E.164 format?
   - `dateOfBirth`: ISO date? `yyyy-MM-dd`?
   - `gender`: Enum value? 'MALE', 'FEMALE', 'OTHER'?
3. Update test request body to match DTO requirements

**Priority:** HIGH - Blocks patient creation

**Investigation:**
```bash
grep -r "class CreatePatientDto" src/patients/
# Check DTO decorators and validations
```

---

### ❌ TC-E2E-004: Doctor Consultation to Pharmacy Handoff

**Error:**
```
expected 400 to be one of 200,201

Location: Consultation creation endpoint
POST /api/v1/doctor/consultations
```

**Root Cause:**
- Invalid consultation request body
- Missing required fields or wrong field types

**Fix:**
1. Check `src/doctor/dtos/create-consultation.dto.ts`
2. Verify required fields:
   - `visitId`: Should it be in path or body?
   - `patientId`: Required?
   - `facilityId`: Required?
   - `diagnosis`: Required?
   - `prescriptions`: Array structure correct?

**Priority:** HIGH - Blocks consultation creation

---

### ❌ TC-E2E-005: Pharmacy Pickup Verification

**Error:**
```
expected 400 to be one of 200,201

Location: Pharmacy dispense endpoint
POST /api/v1/pharmacy/dispense
```

**Root Cause:**
- Invalid dispense request body
- Missing required fields or wrong structure

**Fix:**
1. Check `src/pharmacy/dtos/dispense.dto.ts`
2. Verify required fields:
   - `patientId`: Present?
   - `consultationId` vs `prescriptionId`: Which one?
   - `verificationMethod`: Enum value? 'face', 'otp'?
   - `batchNumber`: Required?

**Priority:** HIGH - Blocks pharmacy dispense

---

### ❌ TC-E2E-006: Family Member Pickup OTP

**Error:**
```
expected 404 to be one of 200,201

Location: OTP send endpoint
POST /api/v1/auth/otp/send
```

**Root Cause:**
- Same as TC-E2E-002 - OTP endpoint not found

**Priority:** HIGH - Depends on finding correct OTP endpoint

---

## Investigation Checklist

### Step 1: Find Actual Endpoints
```bash
# List all endpoints in auth controller
grep -r "Post\|Get\|Patch\|Delete" src/auth/auth.controller.ts

# Find OTP-related endpoints
grep -r "otp" src/auth/ -i

# Find patient endpoints
grep -r "Post\|Get\|Patch" src/patients/patients.controller.ts

# Find doctor endpoints
grep -r "consultation" src/doctor/ -i
```

### Step 2: Check DTOs
```bash
# Patient DTO
cat src/patients/dtos/create-patient.dto.ts

# Auth OTP DTO
cat src/auth/dtos/otp*.dto.ts

# Doctor consultation DTO
cat src/doctor/dtos/create-consultation.dto.ts

# Pharmacy dispense DTO
cat src/pharmacy/dtos/dispense.dto.ts
```

### Step 3: Check Validation Errors
Run tests with verbose output:
```bash
npm run test:e2e -- test/e2e/16-staged-opd.e2e-spec.ts --verbose 2>&1 | grep -A 5 "400\|409\|404"
```

---

## Fixing Strategy (Priority Order)

### 1. Fix Phone Number Duplication (CRITICAL)
**File:** Test setup  
**Impact:** Blocks all tests using `seedPatient()`

**Option A - Timestamp-based phone:**
```typescript
const uniquePhone = () => `9${Date.now() % 1000000000}`;
```

**Option B - Random digits:**
```typescript
const uniquePhone = () => `9${Math.floor(100000000 + Math.random() * 900000000)}`;
```

**Test:** Modify `beforeAll()` to call seedPatient multiple times, should succeed

---

### 2. Find Correct Endpoint Paths
**File:** Test implementation  
**Impact:** 404 errors on OTP, consultation, dispense endpoints

**Commands:**
```bash
# Find all endpoints
grep -r "@Post\|@Get\|@Patch" src/ | grep -E "(auth|patient|doctor|pharmacy)" | head -20

# Check actual routes in module files
grep -r "forRoutes\|route\|path" src/auth/ src/doctor/ src/pharmacy/
```

**Result:** Update test file with correct paths

---

### 3. Fix Request Body Validation
**File:** Test implementation  
**Impact:** 400 errors on patient, consultation, dispense creation

**For each failing endpoint:**
1. Read the DTO file
2. Check `@IsString()`, `@IsEnum()`, `@IsDate()` decorators
3. Update test request to match exactly
4. Test independently with curl-like test to verify

**Example:**
```typescript
// If DTO shows:
// @IsEnum(['MALE', 'FEMALE', 'OTHER'])
// gender: string;

// Then test should use:
gender: 'MALE' // Not Gender.MALE
```

---

## What's Working ✅

The good news:
- Test infrastructure is solid (tests run in ~10 seconds)
- Jest setup correct
- Database connectivity works
- Auth helper seeding mostly works
- Test patterns are sound

**Placeholder tests all pass** (TC-E2E-007 to TC-E2E-012) because they're just:
```typescript
it('should do something', () => {
  expect(true).toBe(true);
});
```

---

## Next Immediate Actions

### Today (2026-04-15):

1. ✅ **Run investigation commands above** to find:
   - [ ] Correct OTP endpoint path
   - [ ] Correct patient creation DTO
   - [ ] Correct consultation DTO
   - [ ] Correct pharmacy dispense DTO

2. ✅ **Fix phone number duplication** - use timestamp or better randomization

3. ✅ **Update test requests** with correct DTOs and field names

4. ✅ **Re-run tests** - should see 400 errors replaced with real endpoint errors

### Tomorrow (2026-04-16):

1. Address remaining endpoint issues (missing endpoints vs. wrong DTOs)
2. Implement missing endpoints if any
3. Get TC-E2E-001 through TC-E2E-006 to pass (6/6)
4. Move to remaining test cases

---

## Test Failure Timeline

```
❌ TC-E2E-001 Failure (line 273)
   → seedPatient() 409 conflict (phone duplicate)

❌ TC-E2E-002 Failure (line 293)
   → POST /api/v1/auth/otp/send 404 (endpoint not found)

❌ TC-E2E-003 Failure (line 350)
   → POST /api/v1/patients 400 (bad request - DTO validation)

❌ TC-E2E-004 Failure (line 432)
   → POST /api/v1/doctor/consultations 400 (bad request - DTO validation)

❌ TC-E2E-005 Failure (line 508)
   → POST /api/v1/pharmacy/dispense 400 (bad request - DTO validation)

❌ TC-E2E-006 Failure (line 579)
   → POST /api/v1/auth/otp/send 404 (endpoint not found - same as TC-E2E-002)
```

---

## Success Criteria (This Week)

- [ ] All 6 tests pass (TC-E2E-001 to TC-E2E-006)
- [ ] Phone number duplication fixed
- [ ] All endpoints found and paths verified
- [ ] All DTOs matched to request bodies
- [ ] No 400/404/409 errors
- [ ] Audit trails complete for each test

---

**Next Step:** Run investigation commands to get actual endpoint paths and DTO requirements.
