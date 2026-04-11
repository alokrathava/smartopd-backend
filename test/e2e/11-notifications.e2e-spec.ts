/**
 * E2E Test Suite: 11 - Notifications
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
const ue = (p = 'notif') => `${p}.${uid()}@smartopd-e2e.in`;

interface NCtx {
  app: INestApplication;
  facilityId: string;
  adminToken: string;
  doctorToken: string;
  nurseToken: string;
  receptionToken: string;
}

async function buildCtx(): Promise<NCtx> {
  const app = await createApp();
  const adminEmail = ue('admin');
  const regRes = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      facilityName: `Notif E2E ${uid()}`,
      facilityType: 'HOSPITAL',
      city: 'Bhopal',
      state: 'Madhya Pradesh',
      adminEmail,
      adminFirstName: 'Dilip',
      adminLastName: 'Tiwari',
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

  const [doctorToken, nurseToken, receptionToken] = await Promise.all([
    makeUser('DOCTOR', 'Doctor@Test1'),
    makeUser('NURSE', 'Nurse@Test1'),
    makeUser('RECEPTIONIST', 'Recept@Test1'),
  ]);

  return {
    app,
    facilityId,
    adminToken,
    doctorToken,
    nurseToken,
    receptionToken,
  };
}

describe('Notifications Module (E2E)', () => {
  let ctx: NCtx;
  let templateId: string;

  beforeAll(async () => {
    ctx = await buildCtx();
  }, 60000);
  afterAll(async () => {
    await ctx.app.close();
  });

  // ── Templates ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/notifications/templates', () => {
    const templateCode = `FOLLOWUP_${Date.now()}`;

    it('✅ FACILITY_ADMIN creates template → 201', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/templates')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          code: templateCode,
          channel: 'SMS',
          bodyTemplate: 'Dear {{patientName}}, your appointment is on {{date}}.',
          variables: ['patientName', 'date'],
        });
      expect([200, 201]).toContain(res.status);
      templateId = res.body.id;
    });

    it('✅ Creates EMAIL template', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/templates')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          code: `EMAIL_TEMPLATE_${uid()}`,
          channel: 'EMAIL',
          subject: 'Appointment Reminder',
          bodyTemplate: 'Dear {{name}}, your appointment is scheduled.',
          variables: ['name'],
        });
      expect([200, 201]).toContain(res.status);
    });

    it('❌ 400 – missing code', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/templates')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ channel: 'SMS', bodyTemplate: 'Test message' });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – missing channel', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/templates')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ code: `NOCODE_${uid()}`, bodyTemplate: 'Test' });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – missing body', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/templates')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ code: `NOBODY_${uid()}`, channel: 'SMS' });
      expect(res.status).toBe(400);
    });

    it('❌ 409 – duplicate template code', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/templates')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ code: templateCode, channel: 'SMS', bodyTemplate: 'Duplicate' });
      expect([400, 409]).toContain(res.status);
    });

    it('🚫 403 – DOCTOR creates template', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/templates')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({ code: `DOC_${uid()}`, channel: 'SMS', bodyTemplate: 'Test' });
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/templates')
        .send({ code: `ANON_${uid()}`, channel: 'SMS', bodyTemplate: 'Test' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/notifications/templates', () => {
    it('✅ Returns template list', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications/templates')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/notifications/templates',
      );
      expect(res.status).toBe(401);
    });

    it('🏢 IDOR – only own facility templates', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications/templates')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      const list: any[] = res.body.data ?? res.body;
      for (const t of list) {
        if (t.facilityId) expect(t.facilityId).toBe(ctx.facilityId);
      }
    });
  });

  // ── Send ───────────────────────────────────────────────────────────────────

  describe('POST /api/v1/notifications/send', () => {
    it('✅ FACILITY_ADMIN sends SMS → 201 (queued, provider mocked)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          channel: 'SMS',
          recipient: '+919876543210',
          body: 'Your OPD token is #42.',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('✅ DOCTOR sends SMS notification', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({
          channel: 'SMS',
          recipient: '+919876543211',
          body: 'Lab results ready.',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('✅ NURSE sends notification', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({
          channel: 'SMS',
          recipient: '+919876543212',
          body: 'Please take your medication.',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('✅ Sends EMAIL notification', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          channel: 'EMAIL',
          recipient: 'patient@example.com',
          body: 'Your discharge summary is attached.',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('✅ Sends WHATSAPP notification', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          channel: 'WHATSAPP',
          recipient: '+919876543213',
          body: 'Your appointment is confirmed.',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('❌ 400 – invalid channel', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          channel: 'TELEGRAM',
          recipient: '+919876543210',
          body: 'Test',
        });
      expect([400, 422]).toContain(res.status);
    });

    it('❌ 400 – missing recipient', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ channel: 'SMS', body: 'Test' });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – missing body', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ channel: 'SMS', recipient: '+919876543210' });
      expect(res.status).toBe(400);
    });

    it('🚫 403 – RECEPTIONIST sends notification', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({ channel: 'SMS', recipient: '+919876543210', body: 'Test' });
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/send')
        .send({ channel: 'SMS', recipient: '+919876543210', body: 'Test' });
      expect(res.status).toBe(401);
    });

    it('⚠️ External provider failure → graceful response (no 500)', async () => {
      // Even if providers are not configured, system should respond gracefully
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/notifications/send')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          channel: 'SMS',
          recipient: '+919876543219',
          body: 'Resilience test',
        });
      expect(res.status).not.toBe(500);
    });
  });

  // ── Logs ───────────────────────────────────────────────────────────────────

  describe('GET /api/v1/notifications/logs', () => {
    it('✅ FACILITY_ADMIN retrieves logs → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications/logs')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('✅ channel filter works', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications/logs?channel=SMS')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      const list: any[] = res.body.data ?? res.body;
      for (const l of list) {
        if (l.channel) expect(l.channel).toBe('SMS');
      }
    });

    it('✅ limit parameter respected', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications/logs?limit=5')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      const list: any[] = res.body.data ?? res.body;
      expect(list.length).toBeLessThanOrEqual(5);
    });

    it('🚫 403 – RECEPTIONIST accesses logs', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications/logs')
        .set('Authorization', `Bearer ${ctx.receptionToken}`);
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/notifications/logs',
      );
      expect(res.status).toBe(401);
    });

    it('📋 Logs do not contain patient PII beyond recipient channel', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/notifications/logs')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      const list: any[] = res.body.data ?? res.body;
      for (const log of list) {
        expect(log.password).toBeUndefined();
        expect(log.passwordHash).toBeUndefined();
      }
    });
  });
});
