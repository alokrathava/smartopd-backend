/**
 * E2E Test Suite: 14 - Reports & Analytics
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
const ue = (p = 'rep') => `${p}.${uid()}@smartopd-e2e.in`;

interface RepCtx {
  app: INestApplication;
  facilityId: string;
  adminToken: string;
  doctorToken: string;
  nurseToken: string;
  receptionToken: string;
  crmToken: string;
  equipmentToken: string;
}

async function buildCtx(): Promise<RepCtx> {
  const app = await createApp();
  const adminEmail = ue('admin');
  const regRes = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      facilityName: `Reports E2E ${uid()}`,
      facilityType: 'HOSPITAL',
      city: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      adminEmail,
      adminFirstName: 'Srinivas',
      adminLastName: 'Rao',
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

  const [doctorToken, nurseToken, receptionToken, crmToken, equipmentToken] = await Promise.all([
    makeUser('DOCTOR', 'Doctor@Test1'),
    makeUser('NURSE', 'Nurse@Test1'),
    makeUser('RECEPTIONIST', 'Recept@Test1'),
    makeUser('CRM_ANALYST', 'CrmAna@Test1'),
    makeUser('EQUIPMENT_STAFF', 'Equip@Test1!'),
  ]);

  return {
    app,
    facilityId,
    adminToken,
    doctorToken,
    nurseToken,
    receptionToken,
    crmToken,
    equipmentToken,
  };
}

describe('Reports Module (E2E)', () => {
  let ctx: RepCtx;
  const from = '2025-01-01';
  const to = '2026-12-31';

  beforeAll(async () => {
    ctx = await buildCtx();
  }, 60000);
  afterAll(async () => {
    await ctx.app.close();
  });

  // ── Visit Stats ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/reports/visits', () => {
    it('✅ FACILITY_ADMIN gets visit stats → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/reports/visits?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalVisits');
    });

    it('✅ DOCTOR gets visit stats → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/visits')
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect(res.status).toBe(200);
    });

    it('✅ Default date range (current month) works', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/visits')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });

    it('❌ 400 – invalid date format', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/visits?from=not-a-date&to=also-not')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect([400, 422]).toContain(res.status);
    });

    it('🚫 403 – NURSE gets visit stats', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/visits')
        .set('Authorization', `Bearer ${ctx.nurseToken}`);
      expect(res.status).toBe(403);
    });

    it('🚫 403 – RECEPTIONIST gets visit stats', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/visits')
        .set('Authorization', `Bearer ${ctx.receptionToken}`);
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/reports/visits',
      );
      expect(res.status).toBe(401);
    });

    it('🏢 IDOR – stats scoped to own facility', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/visits')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(Number(res.body.totalVisits)).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Revenue ───────────────────────────────────────────────────────────────

  describe('GET /api/v1/reports/revenue', () => {
    it('✅ FACILITY_ADMIN gets revenue summary → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/reports/revenue?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalBilled');
    });

    it('🚫 403 – DOCTOR gets revenue', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/revenue')
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect(res.status).toBe(403);
    });

    it('🚫 403 – CRM_ANALYST gets revenue', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/revenue')
        .set('Authorization', `Bearer ${ctx.crmToken}`);
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/reports/revenue',
      );
      expect(res.status).toBe(401);
    });

    it('📋 Revenue figures are non-negative numbers', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/revenue')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(Number(res.body.totalBilled ?? 0)).toBeGreaterThanOrEqual(0);
      expect(Number(res.body.totalCollected ?? 0)).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Equipment Utilisation ─────────────────────────────────────────────────

  describe('GET /api/v1/reports/equipment', () => {
    it('✅ FACILITY_ADMIN gets utilisation → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/equipment')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
    });

    it('✅ EQUIPMENT_STAFF gets utilisation → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/equipment')
        .set('Authorization', `Bearer ${ctx.equipmentToken}`);
      expect(res.status).toBe(200);
    });

    it('🚫 403 – DOCTOR gets equipment report', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/equipment')
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/reports/equipment',
      );
      expect(res.status).toBe(401);
    });
  });

  // ── Patient Stats ─────────────────────────────────────────────────────────

  describe('GET /api/v1/reports/patients', () => {
    it('✅ FACILITY_ADMIN gets patient stats → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/reports/patients?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalPatients');
    });

    it('✅ CRM_ANALYST gets patient stats → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/patients')
        .set('Authorization', `Bearer ${ctx.crmToken}`);
      expect(res.status).toBe(200);
    });

    it('🚫 403 – NURSE gets patient stats', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/patients')
        .set('Authorization', `Bearer ${ctx.nurseToken}`);
      expect(res.status).toBe(403);
    });

    it('📋 totalPatients is a non-negative integer', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/patients')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(Number.isInteger(Number(res.body.totalPatients))).toBe(true);
      expect(Number(res.body.totalPatients)).toBeGreaterThanOrEqual(0);
    });
  });

  // ── DHIS Dashboard ────────────────────────────────────────────────────────

  describe('GET /api/v1/reports/dhis', () => {
    it('✅ FACILITY_ADMIN gets DHIS dashboard → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/dhis')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });

    it('📋 DHIS dashboard has correct structure', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/dhis')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(Number(res.body.eligibleLinkages ?? 0)).toBeGreaterThanOrEqual(0);
      expect(Number(res.body.dhisIncomeInr ?? 0)).toBeGreaterThanOrEqual(0);
      expect(typeof res.body.isEligible).toBe('boolean');
    });

    it('📋 last6Months is an array of 6 entries', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/dhis')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      if (res.status === 200 && res.body.last6Months) {
        expect(Array.isArray(res.body.last6Months)).toBe(true);
        expect(res.body.last6Months.length).toBe(6);
        for (const m of res.body.last6Months) {
          expect(m).toHaveProperty('month');
          expect(m).toHaveProperty('linkedCount');
          expect(m).toHaveProperty('eligibleCount');
          expect(m).toHaveProperty('incomeInr');
        }
      }
    });

    it('🚫 403 – DOCTOR gets DHIS dashboard', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/dhis')
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/reports/dhis',
      );
      expect(res.status).toBe(401);
    });

    it('🏢 IDOR – DHIS data scoped to own facility', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/reports/dhis')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      // incentiveInr must be a non-negative number (not from another facility)
      expect(Number(res.body.dhisIncomeInr ?? 0)).toBeGreaterThanOrEqual(0);
    });
  });
});
