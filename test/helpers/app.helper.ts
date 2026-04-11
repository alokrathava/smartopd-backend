/**
 * Shared E2E test bootstrap helpers.
 *
 * Usage:
 *   import { buildApp, loginAs, registerFacilityAndAdmin } from '../helpers/app.helper.js';
 */

import supertestLib from 'supertest';
import { getHttpServer } from './app.setup';
import { Role } from '../../src/common/enums/role.enum';
import { FacilityType } from '../../src/users/entities/facility.entity';

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
// Static test credentials
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
    email: 'e2e.superadmin@smartopd-test.in',
    password: 'SuperAdm@1!',
    firstName: 'System',
    lastName: 'Admin',
    role: Role.SUPER_ADMIN,
  },
};

// ──────────────────────────────────────────────────────────────────────────────
// Mutable state
// ──────────────────────────────────────────────────────────────────────────────

const tokenCache: Partial<Record<Role, string>> = {};
let testFacilityId: string | null = null;
let seedCompleted = false;

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
    if (
      (res.status === 400 || res.status === 409) &&
      res.body?.message?.toLowerCase().includes('already')
    ) {
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
    if (
      res.status === 400 &&
      (res.body?.message as string | undefined)
        ?.toLowerCase()
        .includes('already')
    ) {
      return;
    }
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
  _ = facilityId;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let _: string;

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

export async function seedTestUsers(): Promise<void> {
  if (seedCompleted) return;

  testFacilityId = await registerFacilityAndAdmin();
  TEST_FACILITY_ID = testFacilityId;

  const adminToken = await loginAs(TEST_CREDENTIALS[Role.FACILITY_ADMIN]);
  tokenCache[Role.FACILITY_ADMIN] = adminToken;

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

export async function getAuthHeader(
  role: Role,
): Promise<{ Authorization: string }> {
  const token = await getToken(role);
  return { Authorization: `Bearer ${token}` };
}

export function clearTokenCache(): void {
  for (const key of Object.keys(tokenCache) as Role[]) {
    delete tokenCache[key];
  }
}
