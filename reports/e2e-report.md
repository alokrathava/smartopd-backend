# E2E Test Coverage Report

Generated: 2026-04-01T01:20:59.331Z

- Repository path: \D:\Business\Code\SmartOPD\smartopd-backend
- Specs scanned: 16
- Total test cases (it()): 561

**Per-file summary**

| Spec file | # tests |
|---|---:|
| test/app.e2e-spec.ts | 1 |
| test/e2e/01-system.e2e-spec.ts | 19 |
| test/e2e/02-auth.e2e-spec.ts | 73 |
| test/e2e/03-users.e2e-spec.ts | 41 |
| test/e2e/04-patients.e2e-spec.ts | 57 |
| test/e2e/05-visits.e2e-spec.ts | 30 |
| test/e2e/06-nurse.e2e-spec.ts | 24 |
| test/e2e/07-doctor.e2e-spec.ts | 34 |
| test/e2e/08-pharmacy.e2e-spec.ts | 34 |
| test/e2e/09-equipment.e2e-spec.ts | 33 |
| test/e2e/10-payment.e2e-spec.ts | 32 |
| test/e2e/11-notifications.e2e-spec.ts | 28 |
| test/e2e/12-crm.e2e-spec.ts | 34 |
| test/e2e/13-audit.e2e-spec.ts | 35 |
| test/e2e/14-reports.e2e-spec.ts | 27 |
| test/e2e/15-rooms.e2e-spec.ts | 59 |

**Category counts (approx)**

| Category | Count |
|---|---:|
| happy | 171 |
| validation | 127 |
| auth | 108 |
| authorization | 53 |
| idor | 32 |
| other | 29 |
| compliance | 21 |
| not-found | 18 |
| security | 14 |
| search | 10 |
| edge | 8 |
| performance | 2 |
| resilience | 2 |
| rate-limit | 1 |

**Top endpoints (most referenced)**

| Endpoint | Occurrences |
|---|---:|
| GET /api/v1 | 19 |
| POST /api/v1/patients | 19 |
| POST /api/v1/auth/login | 16 |
| POST /api/v1/visits | 15 |
| GET /api/v1/audit/logs | 15 |
| POST /api/v1/users | 12 |
| POST /api/v1/auth/register | 11 |
| POST /api/v1/notifications/send | 11 |
| POST /api/v1/rooms | 11 |
| GET /api/v1/auth/me | 10 |
| POST /api/v1/crm/follow-ups | 10 |
| POST /api/v1/beds | 9 |
| POST /api/v1/nurse/vitals | 8 |
| POST /api/v1/payment/bills | 8 |
| POST /api/v1/notifications/templates | 8 |
| POST /api/v1/auth/otp/request | 7 |
| POST /api/v1/auth/invite | 7 |
| POST /api/v1/auth/change-password | 7 |
| POST /api/v1/auth/otp/verify | 6 |
| POST /api/v1/auth/accept-invite | 6 |
| POST /api/v1/patients/${consentPatientId}/consent | 6 |
| POST /api/v1/doctor/consultations | 6 |
| POST /api/v1/doctor/prescriptions/${prescriptionId}/items | 6 |
| POST /api/v1/pharmacy/inventory | 6 |
| POST /api/v1/equipment | 6 |
| POST /api/v1/crm/campaigns | 6 |
| GET /api/v1/reports/visits | 6 |
| GET /api/v1/reports/dhis | 6 |
| PATCH /api/v1/beds/${ctx.bedId}/status | 6 |
| POST /api/v1/auth/refresh | 5 |
| GET /api/v1/patients | 5 |
| PATCH /api/v1/patients/${patientIdA} | 5 |
| POST /api/v1/nurse/triage | 5 |
| POST /api/v1/equipment/leases | 5 |
| POST /api/v1/payment/bills/${billId}/items | 5 |
| POST /api/v1/payment/bills/${finalizedBillId}/pay | 5 |
| GET /api/v1/facilities/occupancy-dashboard | 5 |
| GET /api/v1/visits/queue | 4 |
| POST /api/v1/nurse/mar | 4 |
| POST /api/v1/doctor/prescriptions | 4 |
| GET /api/v1/pharmacy/queue | 4 |
| POST /api/v1/equipment/maintenance | 4 |
| GET /api/v1/notifications/logs | 4 |
| POST /api/v1/crm/segments | 4 |
| GET /api/v1/reports/revenue | 4 |
| GET /api/v1/reports/equipment | 4 |
| GET /api/v1/beds/available | 4 |
| GET /api/v1/wards/${ctx.ward}/occupancy | 4 |
| POST /api/v1/auth/logout | 3 |
| PATCH /api/v1/facilities/${facilityId}/settings | 3 |

**Notes & Limitations**

- This is a best-effort mapping: endpoints are extracted from HTTP call expressions (e.g. .get('/api/v1/...')).
- Tests that call helper functions (helpers defined elsewhere) may not have explicit endpoint strings in the it() block; those tests may show \(no endpoint found\) in the CSV.
- Categories are heuristically inferred from emojis and description text; they may be incomplete.

**Files created**

- reports/e2e-report.md
- reports/e2e-report.csv
