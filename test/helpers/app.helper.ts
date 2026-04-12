/**
 * Shared E2E test bootstrap helpers.
 *
 * Usage:
 *   import { buildApp, loginAs, registerFacilityAndAdmin } from '../helpers/app.helper';
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
      (res.status === 400 || res.status === 409) &&
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

// ──────────────────────────────────────────────────────────────────────────────
// New E2E Helper Functions (for tests expecting buildApp, closeApp, etc.)
// ──────────────────────────────────────────────────────────────────────────────

import {
  initApp as setupInitApp,
  closeApp as setupCloseApp,
  getHttpServer as setupGetHttpServer,
} from './app.setup';
import { INestApplication } from '@nestjs/common';

/**
 * Alias for initApp() to match test expectations
 */
export async function buildApp(): Promise<INestApplication> {
  return setupInitApp();
}

/**
 * Alias for closeApp() to match test expectations
 */
export async function closeApp(): Promise<void> {
  return setupCloseApp();
}

/**
 * Get HTTP server instance
 */
export function getHttpServer() {
  return setupGetHttpServer();
}

/**
 * Minimal patient payload for testing
 */
export function minimalPatientPayload(overrides?: any): any {
  const defaults = {
    firstName: 'Test',
    lastName: 'Patient',
    dateOfBirth: '1990-01-01',
    gender: 'MALE',
    phone: '+916000000001',
    email: 'test@patient.in',
    consentGiven: true,
  };
  return { ...defaults, ...overrides };
}

/**
 * Create a test patient
 */
export async function createPatient(
  token: string,
  payload?: any,
): Promise<{ id: string; [key: string]: any }> {
  const server = setupGetHttpServer();

  const response = await supertestLib(server)
    .post('/api/v1/patients')
    .set('Authorization', `Bearer ${token}`)
    .send(minimalPatientPayload(payload));

  if (response.status !== 201 && response.status !== 200) {
    throw new Error(
      `Failed to create patient: ${response.status} - ${response.body.message || response.text}`,
    );
  }

  return response.body;
}

/**
 * Facility A test context
 */
export interface FacilityContext {
  facilityId: string;
  facilityName: string;
  adminToken: string;
  doctorToken: string;
  nurseToken: string;
  receptionistToken: string;
}

const facilityContexts: Map<string, FacilityContext> = new Map();

/**
 * Get or create Facility A context
 */
export async function getFacilityAContext(): Promise<FacilityContext> {
  if (facilityContexts.has('A')) {
    return facilityContexts.get('A')!;
  }

  // Register a new facility
  const server = setupGetHttpServer();
  const uniqueName = `TestFacility-A-${Date.now()}`;

  const registerRes = await supertestLib(server)
    .post('/api/v1/auth/register')
    .send({
      facilityName: uniqueName,
      facilityType: 'HOSPITAL',
      city: 'Bangalore',
      state: 'Karnataka',
      adminEmail: `admin-a-${Date.now()}@test.in`,
      adminFirstName: 'Admin',
      adminLastName: 'A',
      adminPassword: 'Admin@Test1',
    });

  if (registerRes.status !== 200 && registerRes.status !== 201) {
    throw new Error(
      `Failed to register facility A: ${registerRes.body.message}`,
    );
  }

  const facilityId = registerRes.body.facilityId;
  const adminEmail = registerRes.body.adminEmail;

  // Login as admin
  const loginRes = await supertestLib(server).post('/api/v1/auth/login').send({
    email: adminEmail,
    password: 'Admin@Test1',
  });

  const adminToken = loginRes.body.accessToken;

  // Create other user roles
  const doctorToken = await createUserAndGetToken(
    server,
    adminToken,
    Role.DOCTOR,
    facilityId,
  );
  const nurseToken = await createUserAndGetToken(
    server,
    adminToken,
    Role.NURSE,
    facilityId,
  );
  const receptionistToken = await createUserAndGetToken(
    server,
    adminToken,
    Role.RECEPTIONIST,
    facilityId,
  );

  const context: FacilityContext = {
    facilityId,
    facilityName: uniqueName,
    adminToken,
    doctorToken,
    nurseToken,
    receptionistToken,
  };

  facilityContexts.set('A', context);
  return context;
}

/**
 * Get or create Facility B context
 */
export async function getFacilityBContext(): Promise<FacilityContext> {
  if (facilityContexts.has('B')) {
    return facilityContexts.get('B')!;
  }

  // Register a new facility
  const server = setupGetHttpServer();
  const uniqueName = `TestFacility-B-${Date.now()}`;

  const registerRes = await supertestLib(server)
    .post('/api/v1/auth/register')
    .send({
      facilityName: uniqueName,
      facilityType: 'CLINIC',
      city: 'Mumbai',
      state: 'Maharashtra',
      adminEmail: `admin-b-${Date.now()}@test.in`,
      adminFirstName: 'Admin',
      adminLastName: 'B',
      adminPassword: 'Admin@Test1',
    });

  if (registerRes.status !== 200 && registerRes.status !== 201) {
    throw new Error(
      `Failed to register facility B: ${registerRes.body.message}`,
    );
  }

  const facilityId = registerRes.body.facilityId;
  const adminEmail = registerRes.body.adminEmail;

  // Login as admin
  const loginRes = await supertestLib(server).post('/api/v1/auth/login').send({
    email: adminEmail,
    password: 'Admin@Test1',
  });

  const adminToken = loginRes.body.accessToken;

  // Create other user roles
  const doctorToken = await createUserAndGetToken(
    server,
    adminToken,
    Role.DOCTOR,
    facilityId,
  );
  const nurseToken = await createUserAndGetToken(
    server,
    adminToken,
    Role.NURSE,
    facilityId,
  );
  const receptionistToken = await createUserAndGetToken(
    server,
    adminToken,
    Role.RECEPTIONIST,
    facilityId,
  );

  const context: FacilityContext = {
    facilityId,
    facilityName: uniqueName,
    adminToken,
    doctorToken,
    nurseToken,
    receptionistToken,
  };

  facilityContexts.set('B', context);
  return context;
}

/**
 * Helper to create a user and get their token
 */
async function createUserAndGetToken(
  server: any,
  adminToken: string,
  role: Role,
  facilityId: string,
): Promise<string> {
  const uniqueEmail = `user-${role}-${Date.now()}@test.in`;

  // Create user
  const createRes = await supertestLib(server)
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email: uniqueEmail,
      firstName: role,
      lastName: 'User',
      password: 'User@Test1',
      role,
    });

  if (createRes.status === 409) {
    // Email already exists, try again with different timestamp
    return createUserAndGetToken(server, adminToken, role, facilityId);
  }

  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(`Failed to create user ${role}: ${createRes.body.message}`);
  }

  // Login as new user
  const loginRes = await supertestLib(server).post('/api/v1/auth/login').send({
    email: uniqueEmail,
    password: 'User@Test1',
  });

  return loginRes.body.accessToken;
}

/**
 * Invite and activate a user with custom email/name
 */
export async function inviteAndActivateUser(
  app: INestApplication | any,
  adminToken: string,
  userPayload: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  },
): Promise<{
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
}> {
  const server = setupGetHttpServer();

  // Create user via API
  const createRes = await supertestLib(server)
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email: userPayload.email,
      firstName: userPayload.firstName,
      lastName: userPayload.lastName,
      password: 'User@Test1',
      role: userPayload.role,
    });

  if (createRes.status === 409) {
    throw new Error(
      `User with email ${userPayload.email} already exists (409 Conflict)`,
    );
  }

  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(
      `Failed to create user ${userPayload.role}: ${createRes.body?.message || createRes.text}`,
    );
  }

  // Login as new user
  const loginRes = await supertestLib(server).post('/api/v1/auth/login').send({
    email: userPayload.email,
    password: 'User@Test1',
  });

  if (loginRes.status !== 200) {
    throw new Error(
      `Failed to login user ${userPayload.email}: ${loginRes.body?.message || loginRes.text}`,
    );
  }

  return loginRes.body;
}
