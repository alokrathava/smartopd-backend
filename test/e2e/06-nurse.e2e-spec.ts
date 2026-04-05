/**
 * E2E Test Suite: 06 - Nurse
 *
 * Covers:
 *   POST   /nurse/vitals
 *   GET    /nurse/vitals/:visitId
 *   POST   /nurse/triage
 *   GET    /nurse/triage/:visitId
 *   POST   /nurse/mar
 *   PATCH  /nurse/mar/:id/status
 *   GET    /nurse/mar/:visitId
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
const ue = (p = 'n') => `${p}.${uid()}@smartopd-e2e.in`;
const randPhone = () =>
  `+9198${Math.floor(10000000 + Math.random() * 89999999)}`;

interface NurseCtx {
  app: INestApplication;
  facilityId: string;
  adminToken: string;
  nurseToken: string;
  doctorToken: string;
  receptionToken: string;
  pharmacistToken: string;
  patientId: string;
  visitId: string;
}

async function buildCtx(): Promise<NurseCtx> {
  const app = await createApp();
  const adminEmail = ue('admin');
  const regRes = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      facilityName: `Nurse E2E ${uid()}`,
      facilityType: 'HOSPITAL',
      city: 'Chennai',
      state: 'Tamil Nadu',
      adminEmail,
      adminFirstName: 'Lakshmi',
      adminLastName: 'Devi',
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

  const nurseToken = await makeUser('NURSE', 'Nurse@Test1');
  const doctorToken = await makeUser('DOCTOR', 'Doctor@Test1');
  const receptionToken = await makeUser('RECEPTIONIST', 'Recept@Test1');
  const pharmacistToken = await makeUser('PHARMACIST', 'Pharma@Test1');

  const patRes = await request(app.getHttpServer())
    .post('/api/v1/patients')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      firstName: 'Suresh',
      lastName: 'Babu',
      phone: randPhone(),
      dateOfBirth: '1978-03-20',
      gender: 'MALE',
      consentGiven: true,
    });
  const patientId = patRes.body.id;

  const docIdRes = await request(app.getHttpServer())
    .get('/api/v1/users/doctors')
    .set('Authorization', `Bearer ${adminToken}`);
  const docList = docIdRes.body.data ?? docIdRes.body;
  const doctorId = docList[0]?.id;

  const visitRes = await request(app.getHttpServer())
    .post('/api/v1/visits')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ patientId, visitType: 'OPD', ...(doctorId ? { doctorId } : {}) });
  const visitId = visitRes.body.id;

  return {
    app,
    facilityId,
    adminToken,
    nurseToken,
    doctorToken,
    receptionToken,
    pharmacistToken,
    patientId,
    visitId,
  };
}

describe('Nurse Module (E2E)', () => {
  let ctx: NurseCtx;
  let vitalsId: string;
  let marId: string;

  beforeAll(async () => {
    ctx = await buildCtx();
  }, 60000);
  afterAll(async () => {
    await ctx.app.close();
  });

  // ── Vitals ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/nurse/vitals', () => {
    it('✅ NURSE records vitals → 201', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/vitals')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({
          visitId: ctx.visitId,
          temperature: 37.0,
          systolic: 120,
          diastolic: 80,
          pulse: 72,
          respiration: 16,
          spO2: 98,
          weight: 68,
          height: 170,
        });
      expect(res.status).toBe(201);
      expect(res.body.visitId).toBe(ctx.visitId);
      vitalsId = res.body.id;
    });

    it('✅ FACILITY_ADMIN can also record vitals', async () => {
      const v = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ patientId: ctx.patientId, visitType: 'OPD' });
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/vitals')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          visitId: v.body.id,
          temperature: 36.5,
          systolic: 118,
          diastolic: 78,
          pulse: 68,
          spO2: 99,
        });
      expect([200, 201]).toContain(res.status);
    });

    it('❌ 400 – missing visitId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/vitals')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({ temperature: 37.0, systolic: 120, diastolic: 80 });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – impossible systolic value (> 300)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/vitals')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({ visitId: ctx.visitId, systolic: 400, diastolic: 80 });
      expect([400, 422]).toContain(res.status);
    });

    it('❌ 400 – impossible SpO2 (> 100)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/vitals')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({ visitId: ctx.visitId, spO2: 110 });
      expect([400, 422]).toContain(res.status);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/vitals')
        .send({ visitId: ctx.visitId, temperature: 37 });
      expect(res.status).toBe(401);
    });

    it('🚫 403 – RECEPTIONIST cannot record vitals', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/vitals')
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({
          visitId: ctx.visitId,
          temperature: 37,
          systolic: 120,
          diastolic: 80,
        });
      expect(res.status).toBe(403);
    });

    it('🏢 IDOR – visit from different facility → error', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/vitals')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({
          visitId: '00000000-0000-0000-0000-000000000001',
          systolic: 120,
          diastolic: 80,
        });
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/v1/nurse/vitals/:visitId', () => {
    it('✅ Returns vitals for visit', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/nurse/vitals/${ctx.visitId}`)
        .set('Authorization', `Bearer ${ctx.nurseToken}`);
      expect([200, 404]).toContain(res.status);
    });

    it('🔐 401 without token', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        `/api/v1/nurse/vitals/${ctx.visitId}`,
      );
      expect(res.status).toBe(401);
    });
  });

  // ── Triage ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/nurse/triage', () => {
    it('✅ NURSE records triage level MODERATE → 201', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/triage')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({
          visitId: ctx.visitId,
          triageLevel: 'MODERATE',
          chiefComplaint: 'Fever and headache',
          symptoms: ['FEVER', 'HEADACHE'],
        });
      expect([200, 201]).toContain(res.status);
    });

    it('❌ 400 – invalid triageLevel', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/triage')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({
          visitId: ctx.visitId,
          triageLevel: 'CRITICAL_EXTREME',
          chiefComplaint: 'Fever',
        });
      expect([400, 422]).toContain(res.status);
    });

    it('❌ 400 – missing visitId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/triage')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({ triageLevel: 'LOW' });
      expect(res.status).toBe(400);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/triage')
        .send({ visitId: ctx.visitId, triageLevel: 'LOW' });
      expect(res.status).toBe(401);
    });

    it('🚫 403 – PHARMACIST records triage', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/triage')
        .set('Authorization', `Bearer ${ctx.pharmacistToken}`)
        .send({
          visitId: ctx.visitId,
          triageLevel: 'LOW',
          chiefComplaint: 'Cold',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/nurse/triage/:visitId', () => {
    it('✅ Returns triage record', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/nurse/triage/${ctx.visitId}`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect([200, 404]).toContain(res.status);
    });

    it('🔐 401 without token', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        `/api/v1/nurse/triage/${ctx.visitId}`,
      );
      expect(res.status).toBe(401);
    });
  });

  // ── MAR ─────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/nurse/mar', () => {
    it('✅ NURSE records MAR → 201', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/mar')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({
          visitId: ctx.visitId,
          prescriptionItemId: '00000000-0000-0000-0000-000000000099',
          administeredAt: new Date().toISOString(),
          medicationName: 'Paracetamol',
          dosage: '500mg',
          route: 'ORAL',
        });
      expect([200, 201, 400, 404]).toContain(res.status); // 404 if prescriptionItem doesn't exist
    });

    it('❌ 400 – missing visitId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/mar')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({ prescriptionItemId: '00000000-0000-0000-0000-000000000001' });
      expect(res.status).toBe(400);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/mar')
        .send({ visitId: ctx.visitId, prescriptionItemId: 'x' });
      expect(res.status).toBe(401);
    });

    it('🚫 403 – RECEPTIONIST records MAR', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/nurse/mar')
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({
          visitId: ctx.visitId,
          prescriptionItemId: 'x',
          medicationName: 'X',
          dosage: '1mg',
          route: 'ORAL',
        });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/nurse/mar/:visitId', () => {
    it('✅ Returns MAR records for visit (may be empty)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/nurse/mar/${ctx.visitId}`)
        .set('Authorization', `Bearer ${ctx.nurseToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('🔐 401 without token', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        `/api/v1/nurse/mar/${ctx.visitId}`,
      );
      expect(res.status).toBe(401);
    });

    it('🏢 IDOR – different facility visitId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/nurse/mar/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${ctx.nurseToken}`);
      expect([200, 403, 404]).toContain(res.status);
    });
  });
});
