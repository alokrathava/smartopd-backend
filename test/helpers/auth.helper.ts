/**
 * auth.helper.ts
 *
 * JWT token factory for E2E tests.
 *
 * Responsibilities:
 *  1. Register a throw-away test facility + FACILITY_ADMIN on first call.
 *  2. Create one user per Role under that facility.
 *  3. Cache Bearer tokens so repeated test files don't re-login.
 *
 * Usage:
 *   import { getToken, getAuthHeader, seedTestUsers, TEST_FACILITY_ID }
 *     from '../helpers/auth.helper.js';
 *
 *   beforeAll(async () => { await seedTestUsers(); });
 *
 *   it('doctor can view queue', async () => {
 *     const res = await request()
 *       .get('/api/v1/visits/queue')
 *       .set(await getAuthHeader(Role.DOCTOR));
 *     expect(res.status).toBe(200);
 *   });
 */

import supertestLib from 'supertest';
import { getHttpServer } from './app.setup.js';
import { Role } from '../../src/common/enums/role.enum.js';
import { FacilityType } from '../../src/users/entities/facility.entity.js';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    facilityId: string;
    firstName: string;
    lastName: string;
  };
}

interface RegisterResponse {
  message: string;
  facilityId: string;
  adminEmail: string;
}

interface CreateUserResponse {
  id: string;
  email: string;
  role: string;
  facilityId: string;
}

export interface TestCredential {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  userId?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Static test credentials  (passwords meet the validation regex:
// uppercase + lowercase + digit + special char, min 8 chars)
// ──────────────────────────────────────────────────────────────────────────────

export const TEST_CREDENTIALS: Record<Role, TestCredential> = {
  [Role.FACILITY_ADMIN]: {
    email: 'e2e.admin@smartopd-test.in',
    password: 'Admin@Test1',
    firstName: 'Rajesh',
    lastName: 'Sharma',
    role: Role.FACILITY_ADMIN,
  },
  [Role.DOCTOR]: {
    email: 'e2e.doctor@smartopd-test.in',
    password: 'Doctor@Test1',
    firstName: 'Priya',
    lastName: 'Patel',
    role: Role.DOCTOR,
  },
  [Role.NURSE]: {
    email: 'e2e.nurse@smartopd-test.in',
    password: 'Nurse@Test1!',
    firstName: 'Sunita',
    lastName: 'Rao',
    role: Role.NURSE,
  },
  [Role.RECEPTIONIST]: {
    email: 'e2e.receptionist@smartopd-test.in',
    password: 'Recept@Test1',
    firstName: 'Anjali',
    lastName: 'Gupta',
    role: Role.RECEPTIONIST,
  },
  [Role.PHARMACIST]: {
    email: 'e2e.pharmacist@smartopd-test.in',
    password: 'Pharma@Test1',
    firstName: 'Vikram',
    lastName: 'Singh',
    role: Role.PHARMACIST,
  },
  [Role.EQUIPMENT_STAFF]: {
    email: 'e2e.equipment@smartopd-test.in',
    password: 'Equip@Test1!',
    firstName: 'Arjun',
    lastName: 'Mehta',
    role: Role.EQUIPMENT_STAFF,
  },
  [Role.CRM_ANALYST]: {
    email: 'e2e.crm@smartopd-test.in',
    password: 'CrmAna@Test1',
    firstName: 'Deepa',
    lastName: 'Nair',
    role: Role.CRM_ANALYST,
  },
  [Role.SUPER_ADMIN]: {
    // SUPER_ADMIN is never created via the register/create-user flow — tests that
    // need SUPER_ADMIN access should mock or skip; this entry is here for
    // completeness only.
    email: 'e2e.superadmin@smartopd-test.in',
    password: 'SuperAdm@1!',
    firstName: 'System',
    lastName: 'Admin',
    role: Role.SUPER_ADMIN,
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Mutable state (module-level singletons — reset via clearTokenCache())
// ──────────────────────────────────────────────────────────────────────────────

const tokenCache: Partial<Record<Role, string>> = {};
let testFacilityId: string | null = null;
let seedCompleted = false;

/** The UUID of the test facility created during seedTestUsers(). */
export let TEST_FACILITY_ID: string = '';

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

function agent() {
  return supertestLib(getHttpServer());
}

async function loginAs(cred: TestCredential): Promise<string> {
  const res = await agent()
    .post('/api/v1/auth/login')
    .send({ email: cred.email, password: cred.password })
    .set('Content-Type', 'application/json');

  if (res.status !== 200) {
    throw new Error(
      `[auth.helper] Login failed for ${cred.email} ` +
        `(HTTP ${res.status}): ${JSON.stringify(res.body)}`,
    );
  }

  const body = res.body as LoginResponse;
  return body.accessToken;
}

async function registerFacilityAndAdmin(): Promise<string> {
  const adminCred = TEST_CREDENTIALS[Role.FACILITY_ADMIN];

  const res = await agent()
    .post('/api/v1/auth/register')
    .send({
      facilityName: 'SmartOPD E2E Test Hospital',
      facilityType: FacilityType.HOSPITAL,
      city: 'Mumbai',
      state: 'Maharashtra',
      adminEmail: adminCred.email,
      adminFirstName: adminCred.firstName,
      adminLastName: adminCred.lastName,
      adminPassword: adminCred.password,
      adminPhone: '+919876543200',
    })
    .set('Content-Type', 'application/json');

  if (res.status !== 201) {
    // If the facility already exists (from a previous test run), try to log in
    // as admin and retrieve the facilityId from the token payload.
    if (res.status === 400 && res.body?.message?.includes('already')) {
      const token = await loginAs(adminCred);
      const meRes = await agent()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      if (meRes.status !== 200) {
        throw new Error(
          `[auth.helper] Could not retrieve facilityId after duplicate register: ` +
            JSON.stringify(meRes.body),
        );
      }
      return meRes.body.facilityId as string;
    }

    throw new Error(
      `[auth.helper] registerFacility failed (HTTP ${res.status}): ` +
        JSON.stringify(res.body),
    );
  }

  const body = res.body as RegisterResponse;
  return body.facilityId;
}

async function createUserForRole(
  role: Role,
  adminToken: string,
  facilityId: string,
): Promise<void> {
  const cred = TEST_CREDENTIALS[role];

  const res = await agent()
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email: cred.email,
      firstName: cred.firstName,
      lastName: cred.lastName,
      password: cred.password,
      role: cred.role,
      phone: '+919800000001',
    })
    .set('Content-Type', 'application/json');

  if (res.status !== 201 && res.status !== 200) {
    // 400 "email already in use" is acceptable — user exists from prior run
    if (
      res.status === 400 &&
      (res.body?.message as string | undefined)
        ?.toLowerCase()
        .includes('already')
    ) {
      return;
    }
    // Some roles may be protected (e.g. SUPER_ADMIN cannot be created this way)
    if (res.status === 403) {
      return;
    }
    throw new Error(
      `[auth.helper] createUser failed for role ${role} (HTTP ${res.status}): ` +
        JSON.stringify(res.body),
    );
  }

  const body = res.body as CreateUserResponse;
  TEST_CREDENTIALS[role].userId = body.id;
  _ = facilityId; // used implicitly above
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _: string;

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * One-time setup:  register the test facility + admin, then create one user
 * per Role.  Safe to call multiple times (idempotent).
 */
export async function seedTestUsers(): Promise<void> {
  if (seedCompleted) return;

  // 1. Register facility + admin
  testFacilityId = await registerFacilityAndAdmin();
  TEST_FACILITY_ID = testFacilityId;

  // 2. Login as admin to get a token for creating other users
  const adminToken = await loginAs(TEST_CREDENTIALS[Role.FACILITY_ADMIN]);
  tokenCache[Role.FACILITY_ADMIN] = adminToken;

  // 3. Create one user per non-admin, non-super-admin role
  const rolesToCreate: Role[] = [
    Role.DOCTOR,
    Role.NURSE,
    Role.RECEPTIONIST,
    Role.PHARMACIST,
    Role.EQUIPMENT_STAFF,
    Role.CRM_ANALYST,
  ];

  await Promise.all(
    rolesToCreate.map((role) =>
      createUserForRole(role, adminToken, testFacilityId!),
    ),
  );

  seedCompleted = true;
}

/**
 * Returns a cached Bearer access token for the given role.
 * Calls seedTestUsers() automatically if not yet run.
 */
export async function getToken(role: Role): Promise<string> {
  if (!seedCompleted) {
    await seedTestUsers();
  }

  if (tokenCache[role]) {
    return tokenCache[role];
  }

  if (role === Role.SUPER_ADMIN) {
    throw new Error(
      '[auth.helper] SUPER_ADMIN token cannot be obtained in E2E tests. ' +
        'Create a dedicated super-admin fixture or mock the guard.',
    );
  }

  const token = await loginAs(TEST_CREDENTIALS[role]);
  tokenCache[role] = token;
  return token;
}

/**
 * Returns an object suitable for passing to supertest's .set():
 *   .set(await getAuthHeader(Role.DOCTOR))
 */
export async function getAuthHeader(
  role: Role,
): Promise<{ Authorization: string }> {
  const token = await getToken(role);
  return { Authorization: `Bearer ${token}` };
}

/**
 * Clears the in-memory token cache.  Call this in afterAll / after a
 * logout test that revokes tokens.
 */
export function clearTokenCache(): void {
  for (const key of Object.keys(tokenCache) as Role[]) {
    delete tokenCache[key];
  }
}
