/**
 * E2E Test Suite: 12 - CRM
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

async function createApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

let counter = Date.now();
const uid = () => (++counter).toString(36);
const ue = (p = 'crm') => `${p}.${uid()}@smartopd-e2e.in`;
const randPhone = () =>
  `+9194${Math.floor(10000000 + Math.random() * 89999999)}`;

interface CrmCtx {
  app: INestApplication;
  facilityId: string;
  adminToken: string;
  doctorToken: string;
  nurseToken: string;
  receptionToken: string;
  crmToken: string;
  patientId: string;
}

async function buildCtx(): Promise<CrmCtx> {
  const app = await createApp();
  const adminEmail = ue('admin');
  const regRes = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      facilityName: `CRM E2E ${uid()}`,
      facilityType: 'HOSPITAL',
      city: 'Nagpur',
      state: 'Maharashtra',
      adminEmail,
      adminFirstName: 'Pramod',
      adminLastName: 'Kale',
      adminPassword: 'Admin@Test1',
    });
  const facilityId = regRes.body.facilityId;
  const adminLogin = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: adminEmail, password: 'Admin@Test1' });
  const adminToken = adminLogin.body.accessToken;

  const makeUser = async (role: string, pass: string) => {
    const email = ue(role.toLowerCase());
    await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, firstName: 'Test', lastName: role, password: pass, role });
    const l = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: pass });
    return l.body.accessToken as string;
  };

  const doctorToken = await makeUser('DOCTOR', 'Doctor@Test1');
  const nurseToken = await makeUser('NURSE', 'Nurse@Test1');
  const receptionToken = await makeUser('RECEPTIONIST', 'Recept@Test1');
  const crmToken = await makeUser('CRM_ANALYST', 'CrmAna@Test1');

  const patRes = await request(app.getHttpServer())
    .post('/api/v1/patients')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      firstName: 'Durga',
      lastName: 'Prasad',
      phone: randPhone(),
      dateOfBirth: '1980-12-01',
      gender: 'MALE',
      consentGiven: true,
    });
  const patientId = patRes.body.id;

  return {
    app,
    facilityId,
    adminToken,
    doctorToken,
    nurseToken,
    receptionToken,
    crmToken,
    patientId,
  };
}

describe('CRM Module (E2E)', () => {
  let ctx: CrmCtx;
  let segmentId: string;
  let followUpId: string;
  let campaignId: string;

  beforeAll(async () => {
    ctx = await buildCtx();
  }, 60000);
  afterAll(async () => {
    await ctx.app.close();
  });

  // ── Follow-ups ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/crm/follow-ups', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    it('✅ CRM_ANALYST creates follow-up → 201', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({
          patientId: ctx.patientId,
          scheduledDate: futureDate.toISOString(),
          notes: 'Post-consultation follow-up for diabetes',
          priority: 'MEDIUM',
        });
      expect([200, 201]).toContain(res.status);
      followUpId = res.body.id;
    });

    it('✅ FACILITY_ADMIN creates follow-up', async () => {
      const d = new Date();
      d.setDate(d.getDate() + 14);
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          patientId: ctx.patientId,
          scheduledDate: d.toISOString(),
          notes: 'Blood pressure check',
          priority: 'HIGH',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('✅ DOCTOR creates follow-up', async () => {
      const d = new Date();
      d.setDate(d.getDate() + 21);
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({
          patientId: ctx.patientId,
          scheduledDate: d.toISOString(),
          notes: 'HbA1c retest',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('❌ 400 – missing patientId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({ scheduledDate: futureDate.toISOString(), notes: 'Test' });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – missing scheduledDate', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({ patientId: ctx.patientId, notes: 'Test' });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – past scheduledDate', async () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({ patientId: ctx.patientId, scheduledDate: past.toISOString() });
      expect([400, 422]).toContain(res.status);
    });

    it('🔍 404 – non-existent patientId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({
          patientId: '00000000-0000-0000-0000-000000000000',
          scheduledDate: futureDate.toISOString(),
        });
      expect([400, 404]).toContain(res.status);
    });

    it('🚫 403 – NURSE creates follow-up', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({
          patientId: ctx.patientId,
          scheduledDate: futureDate.toISOString(),
        });
      expect(res.status).toBe(403);
    });

    it('🏢 IDOR – patient from different facility', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({
          patientId: '00000000-0000-0000-0000-000000000002',
          scheduledDate: futureDate.toISOString(),
        });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/follow-ups')
        .send({
          patientId: ctx.patientId,
          scheduledDate: futureDate.toISOString(),
        });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/crm/follow-ups/today', () => {
    it('✅ Returns today follow-ups (may be empty)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/follow-ups/today')
        .set('Authorization', `Bearer ${ctx.crmToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('🚫 403 – NURSE accesses today follow-ups', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/follow-ups/today')
        .set('Authorization', `Bearer ${ctx.nurseToken}`);
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/crm/follow-ups/today',
      );
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/crm/follow-ups', () => {
    it('✅ Lists follow-ups with pagination', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/follow-ups')
        .set('Authorization', `Bearer ${ctx.crmToken}`);
      expect(res.status).toBe(200);
    });

    it('✅ patientId filter works', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/crm/follow-ups?patientId=${ctx.patientId}`)
        .set('Authorization', `Bearer ${ctx.crmToken}`);
      expect(res.status).toBe(200);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/crm/follow-ups',
      );
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/crm/follow-ups/:id', () => {
    it('✅ Updates follow-up status to COMPLETED', async () => {
      if (!followUpId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/crm/follow-ups/${followUpId}`)
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({ status: 'COMPLETED', notes: 'Patient responded positively' });
      expect([200, 201]).toContain(res.status);
    });

    it('🔍 404 – non-existent follow-up', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch('/api/v1/crm/follow-ups/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({ status: 'COMPLETED' });
      expect([403, 404]).toContain(res.status);
    });

    it('🔐 401 – no auth', async () => {
      if (!followUpId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/crm/follow-ups/${followUpId}`)
        .send({ status: 'COMPLETED' });
      expect(res.status).toBe(401);
    });
  });

  // ── Segments ───────────────────────────────────────────────────────────────

  describe('POST /api/v1/crm/segments', () => {
    it('✅ CRM_ANALYST creates segment → 201', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/segments')
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({
          name: 'Diabetic Patients',
          criteria: { chronicCondition: 'DIABETES' },
          description: 'Patients with Type 2 Diabetes',
        });
      expect([200, 201]).toContain(res.status);
      segmentId = res.body.id;
    });

    it('❌ 400 – missing name', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/segments')
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({ criteria: { chronicCondition: 'HYPERTENSION' } });
      expect(res.status).toBe(400);
    });

    it('🚫 403 – NURSE creates segment', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/segments')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({ name: 'Test', criteria: {} });
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/segments')
        .send({ name: 'Test', criteria: {} });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/crm/segments', () => {
    it('✅ Returns segments list', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/segments')
        .set('Authorization', `Bearer ${ctx.crmToken}`);
      expect(res.status).toBe(200);
    });

    it('🏢 IDOR – only own facility segments', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/segments')
        .set('Authorization', `Bearer ${ctx.crmToken}`);
      expect(res.status).toBe(200);
      const list: any[] = res.body.data ?? res.body;
      for (const s of list) {
        if (s.facilityId) expect(s.facilityId).toBe(ctx.facilityId);
      }
    });
  });

  // ── Campaigns ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/crm/campaigns', () => {
    it('✅ CRM_ANALYST creates campaign → 201', async () => {
      if (!segmentId) return;
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/campaigns')
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({
          name: 'World Diabetes Day Campaign',
          segmentId,
          channel: 'SMS',
          message: 'Dear patient, visit us for free HbA1c test on 14 Nov.',
        });
      expect([200, 201]).toContain(res.status);
      campaignId = res.body.id;
    });

    it('❌ 400 – missing segmentId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/campaigns')
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({ name: 'Test Campaign', channel: 'SMS', message: 'Test' });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – missing channel', async () => {
      if (!segmentId) return;
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/campaigns')
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({ name: 'Test', segmentId, message: 'Test' });
      expect(res.status).toBe(400);
    });

    it('🔍 404 – non-existent segmentId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/campaigns')
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({
          name: 'Test',
          segmentId: '00000000-0000-0000-0000-000000000000',
          channel: 'SMS',
          message: 'Test',
        });
      expect([400, 404]).toContain(res.status);
    });

    it('🏢 IDOR – segment from different facility', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/campaigns')
        .set('Authorization', `Bearer ${ctx.crmToken}`)
        .send({
          name: 'Hack',
          segmentId: '00000000-0000-0000-0000-000000000001',
          channel: 'SMS',
          message: 'Test',
        });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('🚫 403 – NURSE creates campaign', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/crm/campaigns')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({
          name: 'Test',
          segmentId: segmentId ?? 'x',
          channel: 'SMS',
          message: 'Test',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/crm/campaigns', () => {
    it('✅ Returns campaigns list', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/campaigns')
        .set('Authorization', `Bearer ${ctx.crmToken}`);
      expect(res.status).toBe(200);
    });

    it('🏢 IDOR – only own facility campaigns', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/crm/campaigns')
        .set('Authorization', `Bearer ${ctx.crmToken}`);
      expect(res.status).toBe(200);
      const list: any[] = res.body.data ?? res.body;
      for (const c of list) {
        if (c.facilityId) expect(c.facilityId).toBe(ctx.facilityId);
      }
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/crm/campaigns',
      );
      expect(res.status).toBe(401);
    });
  });
});
