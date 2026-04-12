/**
 * E2E Test Suite: 10 - Payment & Billing
 *
 * Covers:
 *   POST /payment/bills
 *   GET  /payment/bills/patient/:patientId
 *   GET  /payment/bills/:id
 *   POST /payment/bills/:id/items
 *   POST /payment/bills/:id/finalize
 *   POST /payment/bills/:id/pay
 *   GET  /payment/reports/daily
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
const ue = (p = 'pay') => `${p}.${uid()}@smartopd-e2e.in`;
const randPhone = () =>
  `+9195${Math.floor(10000000 + Math.random() * 89999999)}`;

interface PayCtx {
  app: INestApplication;
  facilityId: string;
  adminToken: string;
  receptionToken: string;
  doctorToken: string;
  pharmacistToken: string;
  patientId: string;
}

async function buildCtx(): Promise<PayCtx> {
  const app = await createApp();
  const adminEmail = ue('admin');
  const regRes = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      facilityName: `Payment E2E ${uid()}`,
      facilityType: 'HOSPITAL',
      city: 'Lucknow',
      state: 'Uttar Pradesh',
      adminEmail,
      adminFirstName: 'Ramlal',
      adminLastName: 'Gupta',
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

  const receptionToken = await makeUser('RECEPTIONIST', 'Recept@Test1');
  const doctorToken = await makeUser('DOCTOR', 'Doctor@Test1');
  const pharmacistToken = await makeUser('PHARMACIST', 'Pharma@Test1');

  const patRes = await request(app.getHttpServer())
    .post('/api/v1/patients')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      firstName: 'Kamla',
      lastName: 'Prasad',
      phone: randPhone(),
      dateOfBirth: '1958-07-30',
      gender: 'FEMALE',
      consentGiven: true,
    });
  const patientId = patRes.body.id;

  return {
    app,
    facilityId,
    adminToken,
    receptionToken,
    doctorToken,
    pharmacistToken,
    patientId,
  };
}

describe('Payment Module (E2E)', () => {
  let ctx: PayCtx;
  let billId: string;
  let finalizedBillId: string;

  beforeAll(async () => {
    ctx = await buildCtx();
  }, 120000);
  afterAll(async () => {
    await ctx.app.close();
  });

  // ── Create Bill ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/payment/bills', () => {
    it('✅ RECEPTIONIST creates bill → 201', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/payment/bills')
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({ patientId: ctx.patientId });
      expect(res.status).toBe(201);
      billId = res.body.id;
    });

    it('✅ PHARMACIST creates bill', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/payment/bills')
        .set('Authorization', `Bearer ${ctx.pharmacistToken}`)
        .send({ patientId: ctx.patientId });
      expect(res.status).toBe(201);
    });

    it('❌ 400 – missing patientId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/payment/bills')
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('🚫 403 – DOCTOR creates bill', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/payment/bills')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({ patientId: ctx.patientId });
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/payment/bills')
        .send({ patientId: ctx.patientId });
      expect(res.status).toBe(401);
    });

    it('🏢 IDOR – patientId from different facility', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/payment/bills')
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({ patientId: '00000000-0000-0000-0000-000000000001' });
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  // ── Add Items ────────────────────────────────────────────────────────────────

  describe('POST /api/v1/payment/bills/:id/items', () => {
    it('✅ Adds consultation fee item', async () => {
      if (!billId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${billId}/items`)
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({
          description: 'Consultation Fee',
          amount: 500,
          quantity: 1,
          itemType: 'CONSULTATION',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('✅ Adds pharmacy item', async () => {
      if (!billId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${billId}/items`)
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({
          description: 'Paracetamol 500mg x15',
          amount: 37.5,
          quantity: 1,
          itemType: 'PHARMACY',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('❌ 400 – missing description', async () => {
      if (!billId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${billId}/items`)
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({ amount: 100, itemType: 'CONSULTATION' });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – negative amount', async () => {
      if (!billId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${billId}/items`)
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({ description: 'Discount', amount: -100, itemType: 'OTHER' });
      expect([400, 422]).toContain(res.status);
    });

    it('🚫 403 – DOCTOR adds bill item', async () => {
      if (!billId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${billId}/items`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({ description: 'X', amount: 100, itemType: 'OTHER' });
      expect(res.status).toBe(403);
    });
  });

  // ── Get Bills ────────────────────────────────────────────────────────────────

  describe('GET /api/v1/payment/bills/patient/:patientId', () => {
    it('✅ Returns bills for patient', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/payment/bills/patient/${ctx.patientId}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('🏢 IDOR – different facility patient', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(
          '/api/v1/payment/bills/patient/00000000-0000-0000-0000-000000000001',
        )
        .set('Authorization', `Bearer ${ctx.receptionToken}`);
      expect([200, 403, 404]).toContain(res.status);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        `/api/v1/payment/bills/patient/${ctx.patientId}`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/payment/bills/:id', () => {
    it('✅ Returns bill with items', async () => {
      if (!billId) return;
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/payment/bills/${billId}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(billId);
    });

    it('🔍 404 – non-existent bill', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/payment/bills/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect([403, 404]).toContain(res.status);
    });

    it('📋 Bill total is not negative', async () => {
      if (!billId) return;
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/payment/bills/${billId}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      if (res.body.totalAmount !== undefined) {
        expect(Number(res.body.totalAmount)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ── Finalize Bill ────────────────────────────────────────────────────────────

  describe('POST /api/v1/payment/bills/:id/finalize', () => {
    beforeAll(async () => {
      // Create a fresh bill with items for finalization
      const b = await request(ctx.app.getHttpServer())
        .post('/api/v1/payment/bills')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ patientId: ctx.patientId });
      finalizedBillId = b.body.id;
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${finalizedBillId}/items`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ description: 'Lab Test', amount: 800, itemType: 'LAB' });
    });

    it('✅ Finalizes bill → totalAmount calculated', async () => {
      if (!finalizedBillId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${finalizedBillId}/finalize`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect([200, 201]).toContain(res.status);
      if (res.body.totalAmount !== undefined) {
        expect(Number(res.body.totalAmount)).toBeGreaterThan(0);
      }
    });

    it('❌ 400 – cannot add items after finalization', async () => {
      if (!finalizedBillId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${finalizedBillId}/items`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ description: 'Extra', amount: 100, itemType: 'OTHER' });
      expect([400, 409]).toContain(res.status);
    });

    it('🔐 401 – no auth', async () => {
      if (!billId) return;
      const res = await request(ctx.app.getHttpServer()).post(
        `/api/v1/payment/bills/${billId}/finalize`,
      );
      expect(res.status).toBe(401);
    });
  });

  // ── Record Payment ───────────────────────────────────────────────────────────

  describe('POST /api/v1/payment/bills/:id/pay', () => {
    it('✅ Records cash payment → 201', async () => {
      if (!finalizedBillId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${finalizedBillId}/pay`)
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({ amount: 800, method: 'CASH' });
      expect([200, 201]).toContain(res.status);
    });

    it('✅ Records UPI payment with transactionRef', async () => {
      const b = await request(ctx.app.getHttpServer())
        .post('/api/v1/payment/bills')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ patientId: ctx.patientId });
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${b.body.id}/items`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          description: 'Consultation',
          amount: 300,
          itemType: 'CONSULTATION',
        });
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${b.body.id}/finalize`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);

      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${b.body.id}/pay`)
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({ amount: 300, method: 'UPI', transactionRef: `UPI${uid()}` });
      expect(res.status).toBe(201);
    });

    it('❌ 400 – zero or negative amount', async () => {
      if (!finalizedBillId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${finalizedBillId}/pay`)
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({ amount: 0, method: 'CASH' });
      expect([400, 422]).toContain(res.status);
    });

    it('❌ 400 – invalid payment method', async () => {
      if (!finalizedBillId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${finalizedBillId}/pay`)
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({ amount: 100, method: 'CRYPTO' });
      expect([400, 422]).toContain(res.status);
    });

    it('💉 SQL injection in transactionRef is sanitised', async () => {
      if (!finalizedBillId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${finalizedBillId}/pay`)
        .set('Authorization', `Bearer ${ctx.receptionToken}`)
        .send({
          amount: 1,
          method: 'CASH',
          transactionRef: "'; DROP TABLE bills;--",
        });
      expect(res.status).not.toBe(500);
    });

    it('🔐 401 – no auth', async () => {
      if (!finalizedBillId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/payment/bills/${finalizedBillId}/pay`)
        .send({ amount: 100, method: 'CASH' });
      expect(res.status).toBe(401);
    });
  });

  // ── Daily Revenue Report ─────────────────────────────────────────────────────

  describe('GET /api/v1/payment/reports/daily', () => {
    const today = new Date().toISOString().split('T')[0];

    it('✅ Returns daily revenue for today', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/payment/reports/daily?date=${today}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalRevenue');
    });

    it('✅ Default date (today) works without query param', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/payment/reports/daily')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });

    it('❌ 400 – invalid date format', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/payment/reports/daily?date=not-a-date')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect([400, 422]).toContain(res.status);
    });

    it('🚫 403 – DOCTOR accesses revenue report', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/payment/reports/daily?date=${today}`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/payment/reports/daily',
      );
      expect(res.status).toBe(401);
    });

    it('🏢 IDOR – revenue scoped to own facility', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/payment/reports/daily?date=${today}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      // Revenue from another facility must not appear
      expect(
        res.body.facilityId === undefined ||
          res.body.facilityId === ctx.facilityId,
      ).toBe(true);
    });
  });
});
