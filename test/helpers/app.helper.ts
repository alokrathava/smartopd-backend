/**
 * Shared E2E test bootstrap helpers.
 *
 * Usage:
 *   import { buildApp, loginAs, registerFacilityAndAdmin } from '../helpers/app.helper.js';
 */

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter.js';

// ─── Application bootstrap ────────────────────────────────────────────────────

let cachedApp: INestApplication | null = null;

export async function buildApp(): Promise<INestApplication> {
  if (cachedApp) return cachedApp;

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.init();
  cachedApp = app;
  return app;
}

export async function closeApp(): Promise<void> {
  if (cachedApp) {
    await cachedApp.close();
    cachedApp = null;
  }
}

// ─── Facility registration helper ────────────────────────────────────────────

export interface FacilityContext {
  facilityId: string;
  adminToken: string;
  adminUserId: string;
}

let facilityACtx: FacilityContext | null = null;
let facilityBCtx: FacilityContext | null = null;

/**
 * Registers a brand-new facility via POST /api/v1/auth/register.
 * The admin account starts as inactive (pending approval).
 * We directly activate it through the DB to simulate SUPER_ADMIN approval.
 */
export async function registerFacility(
  app: INestApplication,
  seed: string,
): Promise<{ facilityId: string; adminEmail: string; adminPassword: string }> {
  const adminEmail = `admin-${seed}-${Date.now()}@smartopd-test.com`;
  const adminPassword = 'Admin@1234';

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      facilityName: `Test Hospital ${seed}`,
      facilityType: 'HOSPITAL',
      city: 'Mumbai',
      state: 'Maharashtra',
      adminEmail,
      adminFirstName: 'Admin',
      adminLastName: seed,
      adminPassword,
      adminPhone: '+919876543210',
    });

  if (res.status !== 201) {
    throw new Error(
      `registerFacility failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }

  const facilityId: string = res.body.facilityId as string;

  // Activate facility + admin via DB (simulate SUPER_ADMIN approval)
  const dataSource = app.get('DataSource' as any);
  await dataSource.query(
    `UPDATE facilities SET is_active = 1, approval_status = 'ACTIVE' WHERE id = ?`,
    [facilityId],
  );
  await dataSource.query(
    `UPDATE users SET is_active = 1 WHERE facility_id = ? AND role = 'FACILITY_ADMIN'`,
    [facilityId],
  );

  return { facilityId, adminEmail, adminPassword };
}

// ─── Login helper ─────────────────────────────────────────────────────────────

export async function loginAs(
  app: INestApplication,
  email: string,
  password: string,
): Promise<{ accessToken: string; userId: string }> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password });

  if (res.status !== 200) {
    throw new Error(
      `loginAs(${email}) failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }

  return {
    accessToken: res.body.accessToken as string,
    userId: res.body.user.id as string,
  };
}

// ─── Invite & activate staff helper ──────────────────────────────────────────

export async function inviteAndActivateUser(
  app: INestApplication,
  adminToken: string,
  params: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  },
): Promise<{ accessToken: string; userId: string }> {
  const password = 'Staff@1234';

  // Invite
  const inviteRes = await request(app.getHttpServer())
    .post('/api/v1/auth/invite')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ ...params });

  if (inviteRes.status !== 201) {
    throw new Error(
      `invite failed (${inviteRes.status}): ${JSON.stringify(inviteRes.body)}`,
    );
  }

  const inviteToken: string = inviteRes.body.inviteToken as string;

  // Accept invite
  const acceptRes = await request(app.getHttpServer())
    .post('/api/v1/auth/accept-invite')
    .send({ inviteToken, password });

  if (acceptRes.status !== 200) {
    throw new Error(
      `acceptInvite failed (${acceptRes.status}): ${JSON.stringify(acceptRes.body)}`,
    );
  }

  return loginAs(app, params.email, password);
}

// ─── Per-suite context factories ──────────────────────────────────────────────

/**
 * Returns a fully set-up FacilityContext (facility A) with admin token.
 * Cached — only registers once per test run.
 */
export async function getFacilityAContext(
  app: INestApplication,
): Promise<FacilityContext> {
  if (facilityACtx) return facilityACtx;

  const { facilityId, adminEmail, adminPassword } = await registerFacility(
    app,
    'A',
  );
  const { accessToken, userId } = await loginAs(app, adminEmail, adminPassword);
  facilityACtx = { facilityId, adminToken: accessToken, adminUserId: userId };
  return facilityACtx;
}

/**
 * Returns a separate FacilityContext (facility B) for IDOR tests.
 * Cached — only registers once per test run.
 */
export async function getFacilityBContext(
  app: INestApplication,
): Promise<FacilityContext> {
  if (facilityBCtx) return facilityBCtx;

  const { facilityId, adminEmail, adminPassword } = await registerFacility(
    app,
    'B',
  );
  const { accessToken, userId } = await loginAs(app, adminEmail, adminPassword);
  facilityBCtx = { facilityId, adminToken: accessToken, adminUserId: userId };
  return facilityBCtx;
}

// ─── Tiny data-creation helpers ───────────────────────────────────────────────

export function minimalPatientPayload(overrides: Record<string, any> = {}) {
  return {
    firstName: 'Ramesh',
    lastName: 'Sharma',
    dateOfBirth: '1985-06-15',
    gender: 'MALE',
    phone: '+919876543210',
    consentGiven: true,
    ...overrides,
  };
}

export async function createPatient(
  app: INestApplication,
  token: string,
  overrides: Record<string, any> = {},
): Promise<Record<string, any>> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/patients')
    .set('Authorization', `Bearer ${token}`)
    .send(minimalPatientPayload(overrides));

  if (res.status !== 201) {
    throw new Error(
      `createPatient failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
  return res.body as Record<string, any>;
}

export async function createVisit(
  app: INestApplication,
  token: string,
  patientId: string,
  overrides: Record<string, any> = {},
): Promise<Record<string, any>> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/visits')
    .set('Authorization', `Bearer ${token}`)
    .send({
      patientId,
      visitType: 'OPD',
      chiefComplaint: 'Fever and headache',
      ...overrides,
    });

  if (res.status !== 201) {
    throw new Error(
      `createVisit failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }
  return res.body as Record<string, any>;
}
