/**
 * seed.helper.ts
 *
 * Database seed helpers for E2E tests.
 *
 * All seed functions POST against the live API (so they go through validation,
 * guards, and business logic) rather than writing directly to the database.
 * This keeps the helpers honest and catches regressions in the endpoints
 * themselves.
 *
 * Usage:
 *   import { seedPatient, seedVisit, cleanupTestData } from '../helpers/seed.helper.js';
 *
 *   let patientId: string;
 *   beforeAll(async () => {
 *     const patient = await seedPatient(TEST_FACILITY_ID);
 *     patientId = patient.id;
 *   });
 *   afterAll(async () => {
 *     await cleanupTestData(TEST_FACILITY_ID);
 *   });
 */

import supertestLib from 'supertest';
import { getHttpServer } from './app.setup.js';
import { getToken, seedTestUsers, TEST_FACILITY_ID } from './auth.helper.js';
import { Role } from '../../src/common/enums/role.enum.js';
import { Gender } from '../../src/common/enums/gender.enum.js';
import { VisitType } from '../../src/visits/entities/visit.entity.js';
import { RoomType } from '../../src/room/entities/room.entity.js';

// ──────────────────────────────────────────────────────────────────────────────
// Typed result shapes
// ──────────────────────────────────────────────────────────────────────────────

export interface SeededPatient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender;
  facilityId: string;
}

export interface SeededVisit {
  id: string;
  visitNumber: string;
  patientId: string;
  doctorId: string | null;
  visitType: VisitType;
  status: string;
  facilityId: string;
}

export interface SeededVitals {
  id: string;
  visitId: string;
  patientId: string;
  facilityId: string;
  temperatureCelsius: number;
  pulseBpm: number;
  systolicBp: number;
  diastolicBp: number;
  spO2: number;
  weightKg: number;
  heightCm: number;
}

export interface SeededRoom {
  id: string;
  name: string;
  type: RoomType;
  facilityId: string;
  capacity: number;
}

export interface SeededBed {
  id: string;
  bedNumber: string;
  roomId: string;
  facilityId: string;
  status: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Realistic Indian name / phone data pools
// ──────────────────────────────────────────────────────────────────────────────

const FIRST_NAMES_MALE = [
  'Aarav',
  'Arjun',
  'Vikram',
  'Rohit',
  'Kiran',
  'Sanjay',
  'Mohan',
  'Rajan',
  'Amit',
  'Suresh',
  'Deepak',
  'Nikhil',
  'Pankaj',
  'Rahul',
  'Varun',
];

const FIRST_NAMES_FEMALE = [
  'Priya',
  'Sunita',
  'Anjali',
  'Deepa',
  'Meena',
  'Kavita',
  'Nisha',
  'Pooja',
  'Rekha',
  'Sonal',
  'Divya',
  'Shreya',
  'Ananya',
  'Ritu',
  'Pallavi',
];

const LAST_NAMES = [
  'Sharma',
  'Patel',
  'Singh',
  'Rao',
  'Gupta',
  'Mehta',
  'Nair',
  'Joshi',
  'Iyer',
  'Pillai',
  'Reddy',
  'Kumar',
  'Verma',
  'Mishra',
  'Bose',
];

const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune'];
const STATES = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Telangana'];

let _seedCounter = 0;

function uid(): number {
  return ++_seedCounter;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates a random valid Indian mobile number (+91[6-9]XXXXXXXXX).
 * We seed with a counter to minimise collisions across test runs.
 */
function randomIndianPhone(): string {
  const prefixDigits = ['6', '7', '8', '9'];
  const prefix = pickRandom(prefixDigits);
  const suffix = String(uid()).padStart(9, '0').slice(-9);
  return `+91${prefix}${suffix}`;
}

function randomDob(): string {
  // Return a DOB between 1950 and 2005
  const year = 1950 + Math.floor(Math.random() * 56);
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

function agent() {
  return supertestLib(getHttpServer());
}

async function ensureSeeded(): Promise<void> {
  await seedTestUsers();
}

// ──────────────────────────────────────────────────────────────────────────────
// Public seed functions
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Creates a patient via POST /api/v1/patients.
 * Uses a RECEPTIONIST token (minimum privilege for patient creation).
 */
export async function seedPatient(
  facilityId: string,
  overrides: Partial<{
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth: string;
    gender: Gender;
    email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    bloodGroup: string;
    allergies: string;
    chronicConditions: string;
  }> = {},
): Promise<SeededPatient> {
  await ensureSeeded();
  const token = await getToken(Role.RECEPTIONIST);

  const isFemale = Math.random() > 0.5;
  const gender: Gender = isFemale ? Gender.FEMALE : Gender.MALE;
  const firstName =
    overrides.firstName ??
    pickRandom(isFemale ? FIRST_NAMES_FEMALE : FIRST_NAMES_MALE);
  const lastName = overrides.lastName ?? pickRandom(LAST_NAMES);
  const city = overrides.city ?? pickRandom(CITIES);
  const stateIdx = CITIES.indexOf(city);
  const state =
    overrides.state ?? (stateIdx >= 0 ? STATES[stateIdx] : 'Maharashtra');

  const payload = {
    firstName,
    lastName,
    dateOfBirth: overrides.dateOfBirth ?? randomDob(),
    gender: overrides.gender ?? gender,
    phone: overrides.phone ?? randomIndianPhone(),
    email: overrides.email,
    address: overrides.address ?? `${uid()} Main Road`,
    city,
    state,
    pincode: overrides.pincode ?? '400001',
    bloodGroup: overrides.bloodGroup ?? 'O+',
    allergies: overrides.allergies,
    chronicConditions: overrides.chronicConditions,
    consentGiven: true,
  };

  const res = await agent()
    .post('/api/v1/patients')
    .set('Authorization', `Bearer ${token}`)
    .send(payload)
    .set('Content-Type', 'application/json');

  if (res.status !== 201 && res.status !== 200) {
    throw new Error(
      `[seed.helper] seedPatient failed (HTTP ${res.status}): ` +
        JSON.stringify(res.body),
    );
  }

  return res.body as SeededPatient;
}

/**
 * Creates a visit via POST /api/v1/visits.
 * Uses a RECEPTIONIST token.
 *
 * @param facilityId - the test facility UUID
 * @param patientId  - UUID of an existing patient
 * @param doctorId   - UUID of a doctor user (optional — pass '' to omit)
 */
export async function seedVisit(
  facilityId: string,
  patientId: string,
  doctorId: string = '',
  overrides: Partial<{
    visitType: VisitType;
    chiefComplaint: string;
    scheduledAt: string;
  }> = {},
): Promise<SeededVisit> {
  await ensureSeeded();
  const token = await getToken(Role.RECEPTIONIST);

  const payload: Record<string, unknown> = {
    patientId,
    visitType: overrides.visitType ?? VisitType.OPD,
    chiefComplaint: overrides.chiefComplaint ?? 'Routine check-up',
    ...scheduledAt(overrides.scheduledAt),
    ...(doctorId ? { doctorId } : {}),
  };

  const res = await agent()
    .post('/api/v1/visits')
    .set('Authorization', `Bearer ${token}`)
    .send(payload)
    .set('Content-Type', 'application/json');

  if (res.status !== 201 && res.status !== 200) {
    throw new Error(
      `[seed.helper] seedVisit failed (HTTP ${res.status}): ` +
        JSON.stringify(res.body),
    );
  }

  return res.body as SeededVisit;
}

function scheduledAt(at?: string): Record<string, string> {
  if (at) return { scheduledAt: at };
  return {};
}

/**
 * Records vitals for a visit via POST /api/v1/nurse/vitals.
 * Uses a NURSE token.
 */
export async function seedVitals(
  visitId: string,
  facilityId: string,
  patientId: string,
  overrides: Partial<{
    temperatureCelsius: number;
    pulseBpm: number;
    respiratoryRate: number;
    systolicBp: number;
    diastolicBp: number;
    spO2: number;
    heightCm: number;
    weightKg: number;
    painScore: number;
    bloodGlucose: number;
    notes: string;
  }> = {},
): Promise<SeededVitals> {
  await ensureSeeded();
  const token = await getToken(Role.NURSE);

  const payload = {
    visitId,
    patientId,
    temperatureCelsius: overrides.temperatureCelsius ?? 37.0,
    pulseBpm: overrides.pulseBpm ?? 72,
    respiratoryRate: overrides.respiratoryRate ?? 16,
    systolicBp: overrides.systolicBp ?? 120,
    diastolicBp: overrides.diastolicBp ?? 80,
    spO2: overrides.spO2 ?? 98.5,
    heightCm: overrides.heightCm ?? 165,
    weightKg: overrides.weightKg ?? 65,
    painScore: overrides.painScore ?? 0,
    bloodGlucose: overrides.bloodGlucose ?? 90,
    notes: overrides.notes ?? 'Routine vitals recorded during E2E test',
  };

  const res = await agent()
    .post('/api/v1/nurse/vitals')
    .set('Authorization', `Bearer ${token}`)
    .send(payload)
    .set('Content-Type', 'application/json');

  if (res.status !== 201 && res.status !== 200) {
    throw new Error(
      `[seed.helper] seedVitals failed (HTTP ${res.status}): ` +
        JSON.stringify(res.body),
    );
  }

  return res.body as SeededVitals;
}

/**
 * Creates a room via POST /api/v1/rooms.
 * Uses a FACILITY_ADMIN token.
 */
export async function seedRoom(
  facilityId: string,
  overrides: Partial<{
    name: string;
    type: RoomType;
    building: string;
    floor: string;
    ward: string;
    capacity: number;
    notes: string;
  }> = {},
): Promise<SeededRoom> {
  await ensureSeeded();
  const token = await getToken(Role.FACILITY_ADMIN);
  const n = uid();

  const payload = {
    name: overrides.name ?? `Test Ward ${n}`,
    type: overrides.type ?? RoomType.GENERAL_WARD,
    building: overrides.building ?? 'Block A',
    floor: overrides.floor ?? 'Ground',
    ward: overrides.ward ?? `W${n}`,
    capacity: overrides.capacity ?? 4,
    notes: overrides.notes ?? `E2E test room ${n}`,
  };

  const res = await agent()
    .post('/api/v1/rooms')
    .set('Authorization', `Bearer ${token}`)
    .send(payload)
    .set('Content-Type', 'application/json');

  if (res.status !== 201 && res.status !== 200) {
    throw new Error(
      `[seed.helper] seedRoom failed (HTTP ${res.status}): ` +
        JSON.stringify(res.body),
    );
  }

  return res.body as SeededRoom;
}

/**
 * Creates a bed via POST /api/v1/beds.
 * Uses a FACILITY_ADMIN token.
 */
export async function seedBed(
  roomId: string,
  facilityId: string,
  overrides: Partial<{
    bedNumber: string;
    hasVentilator: boolean;
    hasMonitor: boolean;
    hasCallBell: boolean;
    hasIvRack: boolean;
    notes: string;
  }> = {},
): Promise<SeededBed> {
  await ensureSeeded();
  const token = await getToken(Role.FACILITY_ADMIN);
  const n = uid();

  const payload = {
    roomId,
    bedNumber: overrides.bedNumber ?? `BED-${n}`,
    hasVentilator: overrides.hasVentilator ?? false,
    hasMonitor: overrides.hasMonitor ?? false,
    hasCallBell: overrides.hasCallBell ?? true,
    hasIvRack: overrides.hasIvRack ?? true,
    notes: overrides.notes ?? `E2E test bed ${n}`,
  };

  const res = await agent()
    .post('/api/v1/beds')
    .set('Authorization', `Bearer ${token}`)
    .send(payload)
    .set('Content-Type', 'application/json');

  if (res.status !== 201 && res.status !== 200) {
    throw new Error(
      `[seed.helper] seedBed failed (HTTP ${res.status}): ` +
        JSON.stringify(res.body),
    );
  }

  return res.body as SeededBed;
}

/**
 * Deletes all test data associated with the given facilityId by calling the
 * appropriate DELETE/cancel endpoints.
 *
 * NOTE: This is best-effort — it soft-deletes patients, cancels active visits,
 * etc.  A hard wipe (direct DB truncation) should be done at a DB migration
 * level for a clean-slate test environment.
 */
export async function cleanupTestData(facilityId: string): Promise<void> {
  if (!facilityId) return;

  await ensureSeeded();
  const adminToken = await getToken(Role.FACILITY_ADMIN);

  // ── Cancel active visits ──────────────────────────────────────────────────
  try {
    const visitsRes = await agent()
      .get('/api/v1/visits')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ date: new Date().toISOString().slice(0, 10) });

    if (visitsRes.status === 200) {
      const visits: Array<{ id: string; status: string }> =
        visitsRes.body?.data ?? visitsRes.body ?? [];

      await Promise.allSettled(
        visits
          .filter(
            (v) => !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(v.status),
          )
          .map((v) =>
            agent()
              .delete(`/api/v1/visits/${v.id}`)
              .set('Authorization', `Bearer ${adminToken}`),
          ),
      );
    }
  } catch {
    // non-fatal
  }

  // ── Soft-delete patients created in this test run ────────────────────────
  try {
    const patientsRes = await agent()
      .get('/api/v1/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ limit: 200 });

    if (patientsRes.status === 200) {
      const patients: Array<{ id: string }> =
        patientsRes.body?.data ?? patientsRes.body ?? [];

      await Promise.allSettled(
        patients.map((p) =>
          agent()
            .delete(`/api/v1/patients/${p.id}`)
            .set('Authorization', `Bearer ${adminToken}`),
        ),
      );
    }
  } catch {
    // non-fatal
  }
}
