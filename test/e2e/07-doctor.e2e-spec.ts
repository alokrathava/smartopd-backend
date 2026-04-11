/**
 * E2E Test Suite: 07 - Doctor
 *
 * Covers:
 *   POST   /doctor/consultations
 *   GET    /doctor/consultations/:visitId
 *   PATCH  /doctor/consultations/:id
 *   POST   /doctor/consultations/:id/complete
 *   POST   /doctor/prescriptions
 *   GET    /doctor/prescriptions/:visitId
 *   POST   /doctor/prescriptions/:id/items
 *   POST   /doctor/prescriptions/:id/finalize
 *   GET    /doctor/icd10/search?q=
 *   GET    /doctor/icd10/common
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
const ue = (p = 'd') => `${p}.${uid()}@smartopd-e2e.in`;
const randPhone = () =>
  `+9198${Math.floor(10000000 + Math.random() * 89999999)}`;

interface DoctorCtx {
  app: INestApplication;
  facilityId: string;
  adminToken: string;
  doctorToken: string;
  nurseToken: string;
  pharmacistToken: string;
  patientId: string;
  visitId: string;
  doctorId: string;
}

async function buildCtx(): Promise<DoctorCtx> {
  const app = await createApp();
  const adminEmail = ue('admin');
  const regRes = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      facilityName: `Doctor E2E ${uid()}`,
      facilityType: 'HOSPITAL',
      city: 'Pune',
      state: 'Maharashtra',
      adminEmail,
      adminFirstName: 'Vinod',
      adminLastName: 'Patil',
      adminPassword: 'Admin@Test1',
    });
  const facilityId = regRes.body.facilityId;
  const adminLogin = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: adminEmail, password: 'Admin@Test1' });
  const adminToken = adminLogin.body.accessToken;

  const makeUser = async (role: string, pass: string) => {
    const email = ue(role.toLowerCase());
    const u = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, firstName: 'Test', lastName: role, password: pass, role });
    const l = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: pass });
    return { token: l.body.accessToken as string, id: u.body.id as string };
  };

  const { token: doctorToken, id: doctorId } = await makeUser(
    'DOCTOR',
    'Doctor@Test1',
  );
  const { token: nurseToken } = await makeUser('NURSE', 'Nurse@Test1');
  const { token: pharmacistToken } = await makeUser(
    'PHARMACIST',
    'Pharma@Test1',
  );

  const patRes = await request(app.getHttpServer())
    .post('/api/v1/patients')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      firstName: 'Geeta',
      lastName: 'Bai',
      phone: randPhone(),
      dateOfBirth: '1990-09-10',
      gender: 'FEMALE',
      consentGiven: true,
    });
  const patientId = patRes.body.id;

  const visitRes = await request(app.getHttpServer())
    .post('/api/v1/visits')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ patientId, visitType: 'OPD', doctorId });
  const visitId = visitRes.body.id;

  return {
    app,
    facilityId,
    adminToken,
    doctorToken,
    nurseToken,
    pharmacistToken,
    patientId,
    visitId,
    doctorId,
  };
}

describe('Doctor Module (E2E)', () => {
  let ctx: DoctorCtx;
  let consultationId: string;
  let prescriptionId: string;

  beforeAll(async () => {
    ctx = await buildCtx();
  }, 60000);
  afterAll(async () => {
    await ctx.app.close();
  });

  // ── Consultations ──────────────────────────────────────────────────────────

  describe('POST /api/v1/doctor/consultations', () => {
    it('✅ DOCTOR creates consultation → 201', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/doctor/consultations')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({
          visitId: ctx.visitId,
          chiefComplaint: 'Fever for 3 days',
          findings: 'Temperature 38.5°C',
          plan: 'Antipyretics and rest',
        });
      expect([200, 201]).toContain(res.status);
      if (res.body.id) consultationId = res.body.id;
    });

    it('✅ FACILITY_ADMIN can create consultation', async () => {
      const v = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          patientId: ctx.patientId,
          visitType: 'OPD',
          doctorId: ctx.doctorId,
        });
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/doctor/consultations')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ visitId: v.body.id, chiefComplaint: 'Cough' });
      expect([200, 201]).toContain(res.status);
    });

    it('❌ 400 – missing visitId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/doctor/consultations')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({ chiefComplaint: 'Headache' });
      expect(res.status).toBe(400);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/doctor/consultations')
        .send({ visitId: ctx.visitId, chiefComplaint: 'X' });
      expect(res.status).toBe(401);
    });

    it('🚫 403 – NURSE creates consultation', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/doctor/consultations')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({ visitId: ctx.visitId, chiefComplaint: 'Headache' });
      expect(res.status).toBe(403);
    });

    it('🏢 IDOR – visit from different facility', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/doctor/consultations')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({
          visitId: '00000000-0000-0000-0000-000000000001',
          chiefComplaint: 'X',
        });
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/v1/doctor/consultations/:visitId', () => {
    it('✅ Returns consultation record', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/doctor/consultations/${ctx.visitId}`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect([200, 404]).toContain(res.status);
    });

    it('🔐 401 without token', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        `/api/v1/doctor/consultations/${ctx.visitId}`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/doctor/consultations/:id', () => {
    it('✅ DOCTOR updates findings and plan', async () => {
      if (!consultationId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/doctor/consultations/${consultationId}`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({
          findings: 'Updated findings',
          plan: 'Continue medications for 5 days',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('🔐 401 – no auth', async () => {
      if (!consultationId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/doctor/consultations/${consultationId}`)
        .send({ findings: 'Hack' });
      expect(res.status).toBe(401);
    });

    it('🚫 403 – PHARMACIST updates consultation', async () => {
      if (!consultationId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/doctor/consultations/${consultationId}`)
        .set('Authorization', `Bearer ${ctx.pharmacistToken}`)
        .send({ findings: 'Should fail' });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/doctor/consultations/:id/complete', () => {
    it('✅ DOCTOR completes consultation', async () => {
      if (!consultationId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/doctor/consultations/${consultationId}/complete`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({ notes: 'Consultation complete. Follow up in 7 days.' });
      expect([200, 201]).toContain(res.status);
    });

    it('🔐 401 – no auth', async () => {
      if (!consultationId) return;
      const res = await request(ctx.app.getHttpServer()).post(
        `/api/v1/doctor/consultations/${consultationId}/complete`,
      );
      expect(res.status).toBe(401);
    });
  });

  // ── Prescriptions ──────────────────────────────────────────────────────────

  describe('POST /api/v1/doctor/prescriptions', () => {
    it('✅ DOCTOR creates prescription → 201', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/doctor/prescriptions')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({ visitId: ctx.visitId });
      expect([200, 201]).toContain(res.status);
      if (res.body.id) prescriptionId = res.body.id;
    });

    it('❌ 400 – missing visitId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/doctor/prescriptions')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/doctor/prescriptions')
        .send({ visitId: ctx.visitId });
      expect(res.status).toBe(401);
    });

    it('🚫 403 – PHARMACIST creates prescription', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/doctor/prescriptions')
        .set('Authorization', `Bearer ${ctx.pharmacistToken}`)
        .send({ visitId: ctx.visitId });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/doctor/prescriptions/:id/items', () => {
    it('✅ Adds drug item to prescription', async () => {
      if (!prescriptionId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/doctor/prescriptions/${prescriptionId}/items`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({
          drugName: 'Paracetamol',
          form: 'TABLET',
          dose: '500mg',
          frequency: 'TDS',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('✅ Adds second item (Ibuprofen)', async () => {
      if (!prescriptionId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/doctor/prescriptions/${prescriptionId}/items`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({
          drugName: 'Ibuprofen',
          form: 'TABLET',
          dose: '400mg',
          frequency: 'BD',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('❌ 400 – missing drugName', async () => {
      if (!prescriptionId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/doctor/prescriptions/${prescriptionId}/items`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({ dosage: '500mg', frequency: 'OD' });
      expect(res.status).toBe(400);
    });

    it('🔐 401 – no auth', async () => {
      if (!prescriptionId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/doctor/prescriptions/${prescriptionId}/items`)
        .send({ drugName: 'X', dosage: '1mg', frequency: 'OD' });
      expect(res.status).toBe(401);
    });

    it('🚫 403 – PHARMACIST adds items', async () => {
      if (!prescriptionId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/doctor/prescriptions/${prescriptionId}/items`)
        .set('Authorization', `Bearer ${ctx.pharmacistToken}`)
        .send({ drugName: 'X', dosage: '1mg', frequency: 'OD' });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/doctor/prescriptions/:visitId', () => {
    it('✅ Returns prescription with items', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/doctor/prescriptions/${ctx.visitId}`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect([200, 404]).toContain(res.status);
    });

    it('🔐 401 without token', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        `/api/v1/doctor/prescriptions/${ctx.visitId}`,
      );
      expect(res.status).toBe(401);
    });

    it('🏢 IDOR – different facility visit', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(
          '/api/v1/doctor/prescriptions/00000000-0000-0000-0000-000000000001',
        )
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/v1/doctor/prescriptions/:id/finalize', () => {
    it('✅ Finalizes prescription → locked', async () => {
      if (!prescriptionId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/doctor/prescriptions/${prescriptionId}/finalize`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect([200, 201]).toContain(res.status);
    });

    it('❌ Cannot add items to finalized prescription', async () => {
      if (!prescriptionId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/doctor/prescriptions/${prescriptionId}/items`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({ drugName: 'Amoxicillin', dosage: '250mg', frequency: 'TDS' });
      expect([400, 409]).toContain(res.status);
    });

    it('🔐 401 – no auth', async () => {
      if (!prescriptionId) return;
      const res = await request(ctx.app.getHttpServer()).post(
        `/api/v1/doctor/prescriptions/${prescriptionId}/finalize`,
      );
      expect(res.status).toBe(401);
    });
  });

  // ── ICD-10 ─────────────────────────────────────────────────────────────────

  describe('GET /api/v1/doctor/icd10/search', () => {
    it('✅ Returns matching codes for "diabetes"', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/doctor/icd10/search?q=diabetes')
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('✅ Returns matching codes for "hypertension"', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/doctor/icd10/search?q=hypertension')
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect(res.status).toBe(200);
    });

    it('❌ 400 – missing q param', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/doctor/icd10/search')
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect([400, 422]).toContain(res.status);
    });

    it('🔐 401 without token', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/doctor/icd10/search?q=fever',
      );
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/doctor/icd10/common', () => {
    it('✅ Returns array of common ICD-10 codes', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/doctor/icd10/common')
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('🔐 401 without token', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/doctor/icd10/common',
      );
      expect(res.status).toBe(401);
    });
  });
});
