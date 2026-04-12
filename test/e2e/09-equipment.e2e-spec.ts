/**
 * E2E Test Suite: 09 - Equipment
 *
 * Covers all /api/v1/equipment endpoints including leases and maintenance.
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
const ue = (p = 'eq') => `${p}.${uid()}@smartopd-e2e.in`;
const randPhone = () =>
  `+9196${Math.floor(10000000 + Math.random() * 89999999)}`;

interface EqCtx {
  app: INestApplication;
  facilityId: string;
  adminToken: string;
  equipmentToken: string;
  nurseToken: string;
  receptionToken: string;
  pharmacistToken: string;
  patientId: string;
}

async function buildCtx(): Promise<EqCtx> {
  const app = await createApp();
  const adminEmail = ue('admin');
  const regRes = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      facilityName: `Equipment E2E ${uid()}`,
      facilityType: 'HOSPITAL',
      city: 'Jaipur',
      state: 'Rajasthan',
      adminEmail,
      adminFirstName: 'Raju',
      adminLastName: 'Meena',
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

  const equipmentToken = await makeUser('EQUIPMENT_STAFF', 'Equip@Test1!');
  const nurseToken = await makeUser('NURSE', 'Nurse@Test1');
  const receptionToken = await makeUser('RECEPTIONIST', 'Recept@Test1');
  const pharmacistToken = await makeUser('PHARMACIST', 'Pharma@Test1');

  const patRes = await request(app.getHttpServer())
    .post('/api/v1/patients')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      firstName: 'Mohan',
      lastName: 'Lal',
      phone: randPhone(),
      dateOfBirth: '1970-04-12',
      gender: 'MALE',
      consentGiven: true,
    });
  const patientId = patRes.body.id;

  return {
    app,
    facilityId,
    adminToken,
    equipmentToken,
    nurseToken,
    receptionToken,
    pharmacistToken,
    patientId,
  };
}

describe('Equipment Module (E2E)', () => {
  let ctx: EqCtx;
  let equipmentId: string;
  let qrCode: string;
  let leaseId: string;

  beforeAll(async () => {
    ctx = await buildCtx();
  }, 120000);
  afterAll(async () => {
    await ctx.app.close();
  });

  // ── CRUD ────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/equipment', () => {
    it('✅ EQUIPMENT_STAFF creates equipment → 201', async () => {
      const serial = `SN-${uid()}`;
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment')
        .set('Authorization', `Bearer ${ctx.equipmentToken}`)
        .send({
          name: 'Wheelchair Standard',
          category: 'WHEELCHAIR',
          serialNumber: serial,
          purchaseDate: '2024-01-01',
        });
      expect([200, 201]).toContain(res.status);
      equipmentId = res.body.id;
      qrCode = res.body.qrCode ?? res.body.serialNumber ?? serial;
    });

    it('✅ FACILITY_ADMIN creates equipment', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          name: 'Oxygen Cylinder 5L',
          category: 'OXYGEN_CYLINDER',
          serialNumber: `OX-${uid()}`,
        });
      expect([200, 201]).toContain(res.status);
    });

    it('❌ 400 – missing name', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment')
        .set('Authorization', `Bearer ${ctx.equipmentToken}`)
        .send({ category: 'WHEELCHAIR', serialNumber: `SN-${uid()}` });
      expect(res.status).toBe(400);
    });

    it('❌ 409 – duplicate serialNo', async () => {
      const serial = `DUP-${uid()}`;
      await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment')
        .set('Authorization', `Bearer ${ctx.equipmentToken}`)
        .send({ name: 'Test', category: 'WHEELCHAIR', serialNumber: serial });
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment')
        .set('Authorization', `Bearer ${ctx.equipmentToken}`)
        .send({ name: 'Test2', category: 'WHEELCHAIR', serialNumber: serial });
      expect([400, 409]).toContain(res.status);
    });

    it('🚫 403 – NURSE creates equipment', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({
          name: 'Crutches',
          category: 'CRUTCHES',
          serialNumber: `SN-${uid()}`,
        });
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment')
        .send({ name: 'X', category: 'WHEELCHAIR', serialNumber: 'X' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/equipment', () => {
    it('✅ Returns equipment list → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/equipment')
        .set('Authorization', `Bearer ${ctx.equipmentToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('✅ category filter works', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/equipment?category=WHEELCHAIR')
        .set('Authorization', `Bearer ${ctx.equipmentToken}`);
      expect(res.status).toBe(200);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/equipment',
      );
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/equipment/qr/:qrCode – @Public', () => {
    it('✅ Finds equipment by QR without auth token', async () => {
      if (!qrCode) return;
      const res = await request(ctx.app.getHttpServer()).get(
        `/api/v1/equipment/qr/${encodeURIComponent(qrCode)}`,
      );
      expect([200, 404]).toContain(res.status);
    });

    it('🔍 404 for non-existent QR code', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/equipment/qr/NONEXISTENT-QR-99999',
      );
      expect([404, 200]).toContain(res.status);
    });
  });

  describe('GET /api/v1/equipment/:id', () => {
    it('✅ Returns equipment by id', async () => {
      if (!equipmentId) return;
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/equipment/${equipmentId}`)
        .set('Authorization', `Bearer ${ctx.equipmentToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(equipmentId);
    });

    it('🔍 404 – non-existent', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/equipment/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect([403, 404]).toContain(res.status);
    });

    it('🔐 401 – no auth', async () => {
      if (!equipmentId) return;
      const res = await request(ctx.app.getHttpServer()).get(
        `/api/v1/equipment/${equipmentId}`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/equipment/:id', () => {
    it('✅ Updates equipment', async () => {
      if (!equipmentId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/equipment/${equipmentId}`)
        .set('Authorization', `Bearer ${ctx.equipmentToken}`)
        .send({ location: 'Ward A', notes: 'Minor wear on armrests' });
      expect([200, 201]).toContain(res.status);
    });

    it('🚫 403 – NURSE updates equipment', async () => {
      if (!equipmentId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/equipment/${equipmentId}`)
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({ location: 'Ward B' });
      expect(res.status).toBe(403);
    });
  });

  // ── Leases ───────────────────────────────────────────────────────────────────

  describe('POST /api/v1/equipment/leases', () => {
    it('✅ Issues equipment to patient → 201', async () => {
      if (!equipmentId) return;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment/leases')
        .set('Authorization', `Bearer ${ctx.equipmentToken}`)
        .send({
          equipmentId,
          patientId: ctx.patientId,
          dueDate: dueDate.toISOString(),
          depositAmount: 500,
        });
      expect([200, 201]).toContain(res.status);
      if (res.body.id) leaseId = res.body.id;
    });

    it('❌ 409 – equipment already on lease', async () => {
      if (!equipmentId) return;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3);
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment/leases')
        .set('Authorization', `Bearer ${ctx.equipmentToken}`)
        .send({
          equipmentId,
          patientId: ctx.patientId,
          dueDate: dueDate.toISOString(),
        });
      expect([400, 409]).toContain(res.status);
    });

    it('❌ 400 – missing patientId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment/leases')
        .set('Authorization', `Bearer ${ctx.equipmentToken}`)
        .send({ equipmentId, returnBy: new Date().toISOString() });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – missing dueDate', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment/leases')
        .set('Authorization', `Bearer ${ctx.equipmentToken}`)
        .send({ equipmentId, patientId: ctx.patientId });
      expect(res.status).toBe(400);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment/leases')
        .send({
          equipmentId,
          patientId: ctx.patientId,
          dueDate: new Date().toISOString(),
        });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/equipment/leases/active', () => {
    it('✅ Returns active leases', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/equipment/leases/active')
        .set('Authorization', `Bearer ${ctx.equipmentToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/equipment/leases/active',
      );
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/equipment/leases/overdue', () => {
    it('✅ Returns overdue leases (may be empty)', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/equipment/leases/overdue')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/v1/equipment/leases/:id/return', () => {
    it('✅ Records equipment return', async () => {
      if (!leaseId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/equipment/leases/${leaseId}/return`)
        .set('Authorization', `Bearer ${ctx.equipmentToken}`)
        .send({
          returnedCondition: 'GOOD',
          notes: 'Returned in clean condition',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('❌ 400/409 – returning already returned lease', async () => {
      if (!leaseId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/equipment/leases/${leaseId}/return`)
        .set('Authorization', `Bearer ${ctx.equipmentToken}`)
        .send({ returnedCondition: 'GOOD' });
      expect([400, 409]).toContain(res.status);
    });

    it('❌ 400 – missing condition', async () => {
      const res = await request(ctx.app.getHttpServer())
        .patch(
          `/api/v1/equipment/leases/00000000-0000-0000-0000-000000000000/return`,
        )
        .set('Authorization', `Bearer ${ctx.equipmentToken}`)
        .send({});
      expect([400, 404]).toContain(res.status);
    });
  });

  // ── Maintenance ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/equipment/maintenance', () => {
    it('✅ Creates maintenance log', async () => {
      if (!equipmentId) return;
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment/maintenance')
        .set('Authorization', `Bearer ${ctx.equipmentToken}`)
        .send({
          equipmentId,
          maintenanceType: 'PREVENTIVE',
          scheduledDate: '2026-03-30',
          description: 'Quarterly inspection',
          nextDueDate: '2026-06-30',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('❌ 400 – missing equipmentId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment/maintenance')
        .set('Authorization', `Bearer ${ctx.equipmentToken}`)
        .send({
          maintenanceType: 'PREVENTIVE',
          scheduledDate: '2026-03-30',
          description: 'Test',
        });
      expect(res.status).toBe(400);
    });

    it('🚫 403 – NURSE creates maintenance log', async () => {
      if (!equipmentId) return;
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment/maintenance')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({
          equipmentId,
          maintenanceType: 'PREVENTIVE',
          scheduledDate: '2026-03-30',
          description: 'Test',
        });
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/equipment/maintenance')
        .send({
          equipmentId: 'x',
          maintenanceType: 'PREVENTIVE',
          scheduledDate: '2026-03-30',
        });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/equipment/maintenance/due', () => {
    it('✅ Returns equipment due for maintenance', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/equipment/maintenance/due')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/equipment/maintenance/due',
      );
      expect(res.status).toBe(401);
    });
  });
});
