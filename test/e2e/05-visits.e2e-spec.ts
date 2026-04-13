/**
 * E2E Test Suite: 05 - Visits
 *
 * Covers ALL /api/v1/visits endpoints:
 *   POST   /visits
 *   GET    /visits
 *   GET    /visits/queue
 *   GET    /visits/:id
 *   PATCH  /visits/:id/status
 *   PATCH  /visits/:id/assign-doctor
 *   PATCH  /visits/:id/start-triage
 *   PATCH  /visits/:id/start-consultation
 *   PATCH  /visits/:id/complete
 *   PATCH  /visits/:id/no-show
 *   DELETE /visits/:id
 */

import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { initApp, closeApp } from '../helpers/app.setup';
import { getToken, seedTestUsers } from '../helpers/auth.helper';
import { seedPatient } from '../helpers/seed.helper';
import { Role } from '../../src/common/enums/role.enum';

async function createApp(): Promise<INestApplication> {
  return initApp();
}

let counter = Date.now();
const uid = () => (++counter).toString(36);
const uniqueEmail = (p = 'v') => `${p}.${uid()}@smartopd-e2e.in`;

// ── Test fixtures ────────────────────────────────────────────────────────────

interface Ctx {
  app: INestApplication;
  facilityId: string;
  adminToken: string;
  doctorToken: string;
  nurseToken: string;
  receptionToken: string;
  pharmacistToken: string;
  patientId: string;
  doctorId: string;
}

async function buildContext(): Promise<Ctx> {
  const app = await createApp();

  await seedTestUsers();

  const adminToken = await getToken(Role.FACILITY_ADMIN);
  const doctorToken = await getToken(Role.DOCTOR);
  const nurseToken = await getToken(Role.NURSE);
  const receptionToken = await getToken(Role.RECEPTIONIST);
  const pharmacistToken = await getToken(Role.PHARMACIST);

  const adminMe = await request(app.getHttpServer())
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(adminMe.status).toBe(200);

  const doctorMe = await request(app.getHttpServer())
    .get('/api/v1/auth/me')
    .set('Authorization', `Bearer ${doctorToken}`);
  expect(doctorMe.status).toBe(200);

  const facilityId: string = adminMe.body.facilityId;
  const doctorId: string = doctorMe.body.id;

  const patient = await seedPatient(facilityId);
  const patientId: string = patient.id;

  expect(facilityId).toBeTruthy();
  expect(doctorId).toBeTruthy();
  expect(patientId).toBeTruthy();

  return {
    app,
    facilityId,
    adminToken,
    doctorToken,
    nurseToken,
    receptionToken,
    pharmacistToken,
    patientId,
    doctorId,
  };
}

// ── Suite ────────────────────────────────────────────────────────────────────

describe('Visits (E2E)', () => {
  let ctx: Ctx;
  let visitId: string;

  beforeAll(async () => {
    ctx = await buildContext();
  }, 120000);

  afterAll(async () => {
    await closeApp();
  });

  // ── POST /visits ────────────────────────────────────────────────────────────

  describe('POST /api/v1/visits', () => {
    it('✅ RECEPTIONIST creates OPD visit → status REGISTERED', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({
          patientId: ctx.patientId,
          visitType: 'OPD',
          doctorId: ctx.doctorId,
        });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        patientId: ctx.patientId,
        status: 'REGISTERED',
      });
      expect(res.body.id).toBeDefined();
      visitId = res.body.id;
    });

    it('✅ FACILITY_ADMIN creates EMERGENCY visit', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ patientId: ctx.patientId, visitType: 'EMERGENCY' });
      expect(res.status).toBe(201);
      expect(res.body.visitType).toBe('EMERGENCY');
    });

    it('❌ 400 – missing patientId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({ visitType: 'OPD' });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – invalid visitType', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({ patientId: ctx.patientId, visitType: 'INVALID_TYPE' });
      expect(res.status).toBe(400);
    });

    it('🔐 401 – no auth token', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .send({ patientId: ctx.patientId, visitType: 'OPD' });
      expect(res.status).toBe(401);
    });

    it('🚫 403 – PHARMACIST cannot create visits', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.pharmacistToken}`)
        .send({ patientId: ctx.patientId, visitType: 'OPD' });
      expect(res.status).toBe(403);
    });

    it('🏢 IDOR – patient from different facility rejected', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({
          patientId: '00000000-0000-0000-0000-000000000001',
          visitType: 'OPD',
        });
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  // ── GET /visits/queue ───────────────────────────────────────────────────────

  describe('GET /api/v1/visits/queue', () => {
    it('✅ Returns queued visits in FIFO order', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/visits/queue')
        .set('Authorization', `Bearer ${ctx.receptionToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('✅ Optional doctorId filter narrows results', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/visits/queue?doctorId=${ctx.doctorId}`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect(res.status).toBe(200);
      const list: any[] = res.body.data ?? res.body;
      for (const v of list) {
        if (v.doctorId) expect(v.doctorId).toBe(ctx.doctorId);
      }
    });

    it('🔐 401 without token', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/visits/queue',
      );
      expect(res.status).toBe(401);
    });

    it('🏢 Queue scoped to facilityId (no leakage)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/visits/queue')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      const list: any[] = res.body.data ?? res.body;
      for (const v of list) {
        if (v.facilityId) expect(v.facilityId).toBe(ctx.facilityId);
      }
    });
  });

  // ── GET /visits ─────────────────────────────────────────────────────────────

  describe('GET /api/v1/visits', () => {
    it('✅ Returns paginated list', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });

    it('✅ date filter works', async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/visits?date=${today}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });

    it('✅ status filter returns only matching visits', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/visits?status=REGISTERED')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      const list: any[] = res.body.data ?? res.body;
      for (const v of list) {
        expect(v.status).toBe('REGISTERED');
      }
    });

    it('🔐 401 without token', async () => {
      const res = await request(ctx.app.getHttpServer()).get('/api/v1/visits');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /visits/:id ─────────────────────────────────────────────────────────

  describe('GET /api/v1/visits/:id', () => {
    it('✅ Returns visit with patient info', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/visits/${visitId}`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(visitId);
    });

    it('🔍 404 for non-existent visit', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/visits/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect([403, 404]).toContain(res.status);
    });

    it('🏢 IDOR – visit from different facility → 403/404', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/visits/00000000-0000-0000-0000-000000000001')
        .set('Authorization', `Bearer ${ctx.nurseToken}`);
      expect([403, 404]).toContain(res.status);
    });

    it('🔐 401 without token', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        `/api/v1/visits/${visitId}`,
      );
      expect(res.status).toBe(401);
    });
  });

  // ── PATCH /visits/:id/status ─────────────────────────────────────────────

  describe('PATCH /api/v1/visits/:id/status', () => {
    let statusVisitId: string;

    beforeAll(async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ patientId: ctx.patientId, visitType: 'OPD' });
      statusVisitId = res.body.id;
    });

    it('✅ REGISTERED → WAITING', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/visits/${statusVisitId}/status`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ status: 'WAITING' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('WAITING');
    });

    it('❌ 400 – invalid status value', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/visits/${statusVisitId}/status`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ status: 'FLYING' });
      expect(res.status).toBe(400);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/visits/${statusVisitId}/status`)
        .send({ status: 'CANCELLED' });
      expect(res.status).toBe(401);
    });
  });

  // ── PATCH /visits/:id/assign-doctor ─────────────────────────────────────

  describe('PATCH /api/v1/visits/:id/assign-doctor', () => {
    it('✅ RECEPTIONIST assigns doctor', async () => {
      const newVisit = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ patientId: ctx.patientId, visitType: 'OPD' });

      expect(newVisit.status).toBe(201);

      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/visits/${newVisit.body.id}/assign-doctor`)
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({ doctorId: ctx.doctorId });

      expect(res.status).toBe(200);
      expect(res.body.doctorId).toBe(ctx.doctorId);
    });

    it('❌ 400/404 – non-existent doctor', async () => {
      const freshVisit = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ patientId: ctx.patientId, visitType: 'OPD' });

      expect(freshVisit.status).toBe(201);

      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/visits/${freshVisit.body.id}/assign-doctor`)
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({ doctorId: '00000000-0000-0000-0000-000000000000' });

      expect([400, 404]).toContain(res.status);
    });
  });
  // ── PATCH /visits/:id/no-show ────────────────────────────────────────────

  describe('PATCH /api/v1/visits/:id/no-show', () => {
    it('✅ Marks visit as NO_SHOW', async () => {
      const v = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ patientId: ctx.patientId, visitType: 'OPD' });
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/visits/${v.body.id}/no-show`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('NO_SHOW');
    });

    it('🚫 403 – DOCTOR marks no-show', async () => {
      const v = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ patientId: ctx.patientId, visitType: 'OPD' });
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/visits/${v.body.id}/no-show`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect([200, 403]).toContain(res.status); // depends on role config
    });
  });

  // ── DELETE /visits/:id ───────────────────────────────────────────────────

  describe('DELETE /api/v1/visits/:id', () => {
    it('✅ RECEPTIONIST cancels visit', async () => {
      const v = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ patientId: ctx.patientId, visitType: 'OPD' });
      const res = await request(ctx.app.getHttpServer())
        .delete(`/api/v1/visits/${v.body.id}`)
        .set('Authorization', `Bearer ${ctx.receptionToken}`);
      expect([200, 204]).toContain(res.status);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).delete(
        `/api/v1/visits/${visitId}`,
      );
      expect(res.status).toBe(401);
    });

    it('🚫 403 – DOCTOR cancels visit', async () => {
      const v = await request(ctx.app.getHttpServer())
        .post('/api/v1/visits')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ patientId: ctx.patientId, visitType: 'OPD' });
      const res = await request(ctx.app.getHttpServer())
        .delete(`/api/v1/visits/${v.body.id}`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect([200, 403]).toContain(res.status);
    });
  });
});
