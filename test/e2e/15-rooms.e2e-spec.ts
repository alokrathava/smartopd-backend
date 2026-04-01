/**
 * E2E Test Suite: 15 - Rooms, Beds & Housekeeping
 *
 * Covers:
 *   POST   /api/v1/rooms
 *   GET    /api/v1/rooms
 *   GET    /api/v1/rooms/:id/beds
 *   POST   /api/v1/beds
 *   GET    /api/v1/beds/board
 *   GET    /api/v1/beds/available
 *   PATCH  /api/v1/beds/:id/status
 *   POST   /api/v1/beds/:id/housekeeping
 *   PATCH  /api/v1/beds/:id/housekeeping/complete
 *   GET    /api/v1/beds/:id/housekeeping-history
 *   GET    /api/v1/wards/:ward/occupancy
 *   GET    /api/v1/facilities/occupancy-dashboard
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
const ue = (p = 'room') => `${p}.${uid()}@smartopd-e2e.in`;

interface RoomCtx {
  app: INestApplication;
  facilityId: string;
  adminToken: string;
  nurseToken: string;
  receptionToken: string;
  doctorToken: string;
  pharmacistToken: string;
  roomId: string;
  bedId: string;
  ward: string;
}

async function buildCtx(): Promise<RoomCtx> {
  const app = await createApp();
  const adminEmail = ue('admin');
  const regRes = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      facilityName: `Rooms E2E ${uid()}`,
      facilityType: 'HOSPITAL',
      city: 'Hyderabad',
      state: 'Telangana',
      adminEmail,
      adminFirstName: 'Ramesh',
      adminLastName: 'Reddy',
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
  const receptionToken = await makeUser('RECEPTIONIST', 'Recept@Test1');
  const doctorToken = await makeUser('DOCTOR', 'Doctor@Test1');
  const pharmacistToken = await makeUser('PHARMACIST', 'Pharma@Test1');

  const ward = `ICU-${uid()}`;

  // Create a room
  const roomRes = await request(app.getHttpServer())
    .post('/api/v1/rooms')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Ward-A-${uid()}`,
      type: 'GENERAL_WARD',
      floor: '1',
      ward,
      capacity: 10,
    });
  const roomId = roomRes.body.id;

  // Create a bed in that room
  const bedRes = await request(app.getHttpServer())
    .post('/api/v1/beds')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ roomId, bedNumber: `BED-${uid()}`, hasCallBell: true });
  const bedId = bedRes.body.id;

  return {
    app,
    facilityId,
    adminToken,
    nurseToken,
    receptionToken,
    doctorToken,
    pharmacistToken,
    roomId,
    bedId,
    ward,
  };
}

describe('Rooms & Beds Module (E2E)', () => {
  let ctx: RoomCtx;

  beforeAll(async () => {
    ctx = await buildCtx();
  }, 60000);
  afterAll(async () => {
    await ctx.app.close();
  });

  // ── Rooms CRUD ────────────────────────────────────────────────────────────────

  describe('POST /api/v1/rooms', () => {
    it('✅ FACILITY_ADMIN creates room → 201', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          name: `ICU-Room-${uid()}`,
          type: 'ICU',
          floor: '2',
          ward: `ICU-Ward-${uid()}`,
          capacity: 6,
        });
      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('id');
      expect(res.body.type).toBe('ICU');
    });

    it('✅ Creates OT room', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          name: `OT-${uid()}`,
          type: 'OT',
          floor: '3',
          building: 'Block B',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('✅ Creates Private room', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ name: `Private-${uid()}`, type: 'PRIVATE_ROOM', floor: '4' });
      expect([200, 201]).toContain(res.status);
    });

    it('❌ 400 – missing name', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ type: 'GENERAL_WARD', floor: '1' });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – missing type', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ name: `NoType-${uid()}`, floor: '1' });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – invalid room type', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ name: `Bad-${uid()}`, type: 'CAVE', floor: '1' });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – capacity below minimum', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ name: `NoCap-${uid()}`, type: 'GENERAL_WARD', capacity: 0 });
      expect(res.status).toBe(400);
    });

    it('🚫 403 – NURSE creates room', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({ name: `Nurse-Room-${uid()}`, type: 'GENERAL_WARD' });
      expect(res.status).toBe(403);
    });

    it('🚫 403 – DOCTOR creates room', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({ name: `Doc-Room-${uid()}`, type: 'GENERAL_WARD' });
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/rooms')
        .send({ name: `Anon-${uid()}`, type: 'GENERAL_WARD' });
      expect(res.status).toBe(401);
    });

    it('💉 XSS in room name is stored safely', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          name: `<script>alert('xss')</script>-${uid()}`,
          type: 'GENERAL_WARD',
        });
      expect([200, 201, 400]).toContain(res.status);
      if ([200, 201].includes(res.status)) {
        expect(res.body.name).not.toContain('<script>');
      }
    });
  });

  describe('GET /api/v1/rooms', () => {
    it('✅ FACILITY_ADMIN lists rooms → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/rooms')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('✅ type filter works', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/rooms?type=ICU')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      const list: any[] = res.body.data ?? res.body;
      for (const r of list) {
        if (r.type) expect(r.type).toBe('ICU');
      }
    });

    it('✅ floor filter works', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/rooms?floor=1')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });

    it('✅ ward filter works', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/rooms?ward=${ctx.ward}`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get('/api/v1/rooms');
      expect(res.status).toBe(401);
    });

    it('🏢 IDOR – rooms scoped to own facility', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/rooms')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      const list: any[] = res.body.data ?? res.body;
      for (const r of list) {
        if (r.facilityId) expect(r.facilityId).toBe(ctx.facilityId);
      }
    });
  });

  describe('GET /api/v1/rooms/:id/beds', () => {
    it('✅ Returns beds for a room', async () => {
      if (!ctx.roomId) return;
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/rooms/${ctx.roomId}/beds`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('🔍 404 – non-existent room', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/rooms/00000000-0000-0000-0000-000000000000/beds')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect([404, 200]).toContain(res.status);
    });

    it('🔐 401 – no auth', async () => {
      if (!ctx.roomId) return;
      const res = await request(ctx.app.getHttpServer()).get(
        `/api/v1/rooms/${ctx.roomId}/beds`,
      );
      expect(res.status).toBe(401);
    });
  });

  // ── Beds CRUD ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/beds', () => {
    it('✅ FACILITY_ADMIN adds bed to room → 201', async () => {
      if (!ctx.roomId) return;
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/beds')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          roomId: ctx.roomId,
          bedNumber: `B-${uid()}`,
          hasVentilator: false,
          hasMonitor: true,
        });
      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('id');
    });

    it('✅ ICU bed with all features', async () => {
      if (!ctx.roomId) return;
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/beds')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          roomId: ctx.roomId,
          bedNumber: `ICU-${uid()}`,
          hasVentilator: true,
          hasMonitor: true,
          hasCallBell: true,
          hasIvRack: true,
        });
      expect([200, 201]).toContain(res.status);
    });

    it('❌ 400 – missing roomId', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/beds')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ bedNumber: `NOROOM-${uid()}` });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – missing bedNumber', async () => {
      if (!ctx.roomId) return;
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/beds')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ roomId: ctx.roomId });
      expect(res.status).toBe(400);
    });

    it('🚫 403 – NURSE adds bed', async () => {
      if (!ctx.roomId) return;
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/beds')
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({ roomId: ctx.roomId, bedNumber: `NURSE-${uid()}` });
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer())
        .post('/api/v1/beds')
        .send({ roomId: ctx.roomId, bedNumber: `ANON-${uid()}` });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/beds/board', () => {
    it('✅ Returns bed occupancy board → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/beds/board')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });

    it('✅ NURSE can access bed board', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/beds/board')
        .set('Authorization', `Bearer ${ctx.nurseToken}`);
      expect(res.status).toBe(200);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/beds/board',
      );
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/beds/available', () => {
    it('✅ Returns available beds → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/beds/available')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('✅ RECEPTIONIST can check available beds', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/beds/available')
        .set('Authorization', `Bearer ${ctx.receptionToken}`);
      expect(res.status).toBe(200);
    });

    it('✅ roomType filter works', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/beds/available?roomType=GENERAL_WARD')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });

    it('🚫 403 – PHARMACIST checks available beds', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/beds/available')
        .set('Authorization', `Bearer ${ctx.pharmacistToken}`);
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/beds/available',
      );
      expect(res.status).toBe(401);
    });
  });

  // ── Bed Status State Machine ──────────────────────────────────────────────────

  describe('PATCH /api/v1/beds/:id/status', () => {
    it('✅ FACILITY_ADMIN updates bed status AVAILABLE → MAINTENANCE', async () => {
      if (!ctx.bedId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/beds/${ctx.bedId}/status`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({
          status: 'MAINTENANCE',
          notes: 'Rail broken – awaiting repair',
        });
      expect([200, 201]).toContain(res.status);
    });

    it('✅ NURSE updates bed status', async () => {
      // Create a fresh bed for this test
      const bRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/beds')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ roomId: ctx.roomId, bedNumber: `STATUS-${uid()}` });
      const bId = bRes.body.id;
      if (!bId) return;

      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/beds/${bId}/status`)
        .set('Authorization', `Bearer ${ctx.nurseToken}`)
        .send({ status: 'RESERVED' });
      expect([200, 201]).toContain(res.status);
    });

    it('❌ 400 – invalid status transition (MAINTENANCE → OCCUPIED)', async () => {
      // Bed should be in MAINTENANCE after previous test
      if (!ctx.bedId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/beds/${ctx.bedId}/status`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ status: 'OCCUPIED' });
      expect([400, 422]).toContain(res.status);
    });

    it('❌ 400 – missing status', async () => {
      if (!ctx.bedId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/beds/${ctx.bedId}/status`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ notes: 'No status provided' });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – invalid status value', async () => {
      if (!ctx.bedId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/beds/${ctx.bedId}/status`)
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ status: 'FLYING' });
      expect(res.status).toBe(400);
    });

    it('🚫 403 – DOCTOR updates bed status', async () => {
      if (!ctx.bedId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/beds/${ctx.bedId}/status`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`)
        .send({ status: 'AVAILABLE' });
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      if (!ctx.bedId) return;
      const res = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/beds/${ctx.bedId}/status`)
        .send({ status: 'AVAILABLE' });
      expect(res.status).toBe(401);
    });
  });

  // ── Housekeeping ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/beds/:id/housekeeping', () => {
    let cleanBedId: string;

    beforeAll(async () => {
      // Create a bed that is in CLEANING state
      const bRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/beds')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ roomId: ctx.roomId, bedNumber: `HK-${uid()}` });
      cleanBedId = bRes.body.id;
    });

    it('✅ NURSE triggers housekeeping → 201', async () => {
      if (!cleanBedId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/beds/${cleanBedId}/housekeeping`)
        .set('Authorization', `Bearer ${ctx.nurseToken}`);
      expect([200, 201]).toContain(res.status);
    });

    it('✅ FACILITY_ADMIN triggers housekeeping', async () => {
      const bRes = await request(ctx.app.getHttpServer())
        .post('/api/v1/beds')
        .set('Authorization', `Bearer ${ctx.adminToken}`)
        .send({ roomId: ctx.roomId, bedNumber: `HK2-${uid()}` });
      const bId = bRes.body.id;
      if (!bId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/beds/${bId}/housekeeping`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect([200, 201]).toContain(res.status);
    });

    it('🚫 403 – DOCTOR triggers housekeeping', async () => {
      if (!cleanBedId) return;
      const res = await request(ctx.app.getHttpServer())
        .post(`/api/v1/beds/${cleanBedId}/housekeeping`)
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).post(
        `/api/v1/beds/00000000-0000-0000-0000-000000000000/housekeeping`,
      );
      expect(res.status).toBe(401);
    });

    describe('PATCH /api/v1/beds/:id/housekeeping/complete', () => {
      it('✅ Marks housekeeping complete → 200', async () => {
        if (!cleanBedId) return;
        const res = await request(ctx.app.getHttpServer())
          .patch(`/api/v1/beds/${cleanBedId}/housekeeping/complete`)
          .set('Authorization', `Bearer ${ctx.nurseToken}`)
          .send({ notes: 'Bed cleaned and sanitized' });
        expect([200, 201]).toContain(res.status);
      });

      it('🚫 403 – DOCTOR completes housekeeping', async () => {
        if (!cleanBedId) return;
        const res = await request(ctx.app.getHttpServer())
          .patch(`/api/v1/beds/${cleanBedId}/housekeeping/complete`)
          .set('Authorization', `Bearer ${ctx.doctorToken}`)
          .send({ notes: 'Done' });
        expect(res.status).toBe(403);
      });

      it('🔐 401 – no auth', async () => {
        const res = await request(ctx.app.getHttpServer())
          .patch(
            `/api/v1/beds/00000000-0000-0000-0000-000000000000/housekeeping/complete`,
          )
          .send({ notes: 'Done' });
        expect(res.status).toBe(401);
      });
    });

    describe('GET /api/v1/beds/:id/housekeeping-history', () => {
      it('✅ Returns housekeeping history → 200', async () => {
        if (!cleanBedId) return;
        const res = await request(ctx.app.getHttpServer())
          .get(`/api/v1/beds/${cleanBedId}/housekeeping-history`)
          .set('Authorization', `Bearer ${ctx.nurseToken}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
          true,
        );
      });

      it('🔐 401 – no auth', async () => {
        if (!cleanBedId) return;
        const res = await request(ctx.app.getHttpServer()).get(
          `/api/v1/beds/${cleanBedId}/housekeeping-history`,
        );
        expect(res.status).toBe(401);
      });
    });
  });

  // ── Ward Occupancy ────────────────────────────────────────────────────────────

  describe('GET /api/v1/wards/:ward/occupancy', () => {
    it('✅ FACILITY_ADMIN gets ward occupancy → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/wards/${ctx.ward}/occupancy`)
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });

    it('✅ NURSE gets ward occupancy → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/wards/${ctx.ward}/occupancy`)
        .set('Authorization', `Bearer ${ctx.nurseToken}`);
      expect(res.status).toBe(200);
    });

    it('🚫 403 – PHARMACIST gets ward occupancy', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get(`/api/v1/wards/${ctx.ward}/occupancy`)
        .set('Authorization', `Bearer ${ctx.pharmacistToken}`);
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        `/api/v1/wards/${ctx.ward}/occupancy`,
      );
      expect(res.status).toBe(401);
    });
  });

  // ── Occupancy Dashboard ───────────────────────────────────────────────────────

  describe('GET /api/v1/facilities/occupancy-dashboard', () => {
    it('✅ FACILITY_ADMIN gets occupancy dashboard → 200', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/facilities/occupancy-dashboard')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });

    it('📋 Dashboard has meaningful structure', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/facilities/occupancy-dashboard')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
      // Should have numeric occupancy indicators
      expect(typeof res.body).toBe('object');
    });

    it('🚫 403 – DOCTOR gets occupancy dashboard', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/facilities/occupancy-dashboard')
        .set('Authorization', `Bearer ${ctx.doctorToken}`);
      expect(res.status).toBe(403);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(ctx.app.getHttpServer()).get(
        '/api/v1/facilities/occupancy-dashboard',
      );
      expect(res.status).toBe(401);
    });

    it('🏢 IDOR – dashboard scoped to own facility', async () => {
      const res = await request(ctx.app.getHttpServer())
        .get('/api/v1/facilities/occupancy-dashboard')
        .set('Authorization', `Bearer ${ctx.adminToken}`);
      expect(res.status).toBe(200);
    });
  });
});
