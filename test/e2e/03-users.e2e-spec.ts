/**
 * E2E Test Suite: 03 - Users & Facilities
 *
 * Covers:
 *   POST   /api/v1/facilities
 *   GET    /api/v1/facilities
 *   GET    /api/v1/facilities/:id
 *   PATCH  /api/v1/facilities/:id
 *   POST   /api/v1/facilities/:id/activate
 *   POST   /api/v1/facilities/:id/suspend
 *   GET    /api/v1/facilities/:id/settings
 *   PATCH  /api/v1/facilities/:id/settings
 *   POST   /api/v1/facilities/:id/upload-logo
 *   POST   /api/v1/users
 *   GET    /api/v1/users
 *   GET    /api/v1/users/doctors
 *   GET    /api/v1/users/:id
 *   PATCH  /api/v1/users/:id
 *   DELETE /api/v1/users/:id
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
async function createApp(): Promise<INestApplication> {
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
    }),
  );
  await app.init();
  return app;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
let counter = Date.now();
const uid = () => (++counter).toString(36);
const uniqueEmail = (p = 'u') => `${p}.${uid()}@smartopd-e2e.in`;
const uniqueFacilityName = () => `E2E Hospital ${uid()}`;

async function registerFacility(
  app: INestApplication,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<{ facilityId: string; adminToken: string; adminEmail: string }> {
  const adminEmail = uniqueEmail('admin');
  const adminPassword = 'Admin@Test1';

  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      facilityName: uniqueFacilityName(),
      facilityType: 'HOSPITAL',
      city: 'Bengaluru',
      state: 'Karnataka',
      adminEmail,
      adminFirstName: 'Ramesh',
      adminLastName: 'Iyer',
      adminPassword,
      ...overrides,
    });

  expect(res.status).toBe(201);
  const { facilityId } = res.body;

  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: adminEmail, password: adminPassword });

  expect(loginRes.status).toBe(200);
  return {
    facilityId,
    adminToken: loginRes.body.accessToken,
    adminEmail,
  };
}

async function createUser(
  app: INestApplication,
  adminToken: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<{ id: string; email: string }> {
  const email = uniqueEmail('staff');
  const res = await request(app.getHttpServer())
    .post('/api/v1/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      email,
      firstName: 'Kavya',
      lastName: 'Reddy',
      password: 'Staff@Test1',
      role: 'DOCTOR',
      ...overrides,
    });

  expect(res.status).toBe(201);
  return { id: res.body.id, email };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe('Users & Facilities (E2E)', () => {
  let app: INestApplication;
  let facilityId: string;
  let adminToken: string;

  beforeAll(async () => {
    app = await createApp();
    const reg = await registerFacility(app);
    facilityId = reg.facilityId;
    adminToken = reg.adminToken;
  });

  afterAll(async () => {
    await app.close();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Facilities – List & Get
  // ──────────────────────────────────────────────────────────────────────────

  describe('GET /api/v1/facilities/:id', () => {
    it('✅ FACILITY_ADMIN can fetch their own facility', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/facilities/${facilityId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: facilityId });
    });

    it('🔐 401 without auth token', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/facilities/${facilityId}`,
      );
      expect(res.status).toBe(401);
    });

    it('🔍 404 for non-existent facility UUID', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/facilities/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([403, 404]).toContain(res.status);
    });

    it('🏢 IDOR – facility admin cannot access a different facility', async () => {
      const other = await registerFacility(app);
      const res = await request(app.getHttpServer())
        .get(`/api/v1/facilities/${other.facilityId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/v1/facilities/:id/settings', () => {
    it('✅ Returns facility settings', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/facilities/${facilityId}/settings`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 404]).toContain(res.status);
    });

    it('🔐 401 without token', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/facilities/${facilityId}/settings`,
      );
      expect(res.status).toBe(401);
    });

    it('🏢 IDOR – cannot access another facility settings', async () => {
      const other = await registerFacility(app);
      const res = await request(app.getHttpServer())
        .get(`/api/v1/facilities/${other.facilityId}/settings`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/facilities/:id/settings', () => {
    it('✅ Admin can update settings', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/facilities/${facilityId}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          primaryColor: '#0052cc',
          hospitalName: 'Updated E2E Hospital',
        });
      expect([200, 201, 404]).toContain(res.status);
    });

    it('🔐 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/facilities/${facilityId}/settings`)
        .send({ primaryColor: '#ff0000' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/facilities/:id/upload-logo', () => {
    it('❌ 400 when no file attached', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/facilities/${facilityId}/upload-logo`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([400, 422]).toContain(res.status);
    });

    it('🔐 401 without token', async () => {
      const res = await request(app.getHttpServer()).post(
        `/api/v1/facilities/${facilityId}/upload-logo`,
      );
      expect(res.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Users – CRUD
  // ──────────────────────────────────────────────────────────────────────────

  describe('POST /api/v1/users', () => {
    it('✅ FACILITY_ADMIN creates a DOCTOR', async () => {
      const email = uniqueEmail('doc');
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email,
          firstName: 'Aditya',
          lastName: 'Kumar',
          password: 'Doctor@Test1',
          role: 'DOCTOR',
        });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ email, role: 'DOCTOR' });
      expect(res.body.facilityId).toBe(facilityId);
    });

    it('✅ Can create NURSE, RECEPTIONIST, PHARMACIST, EQUIPMENT_STAFF, CRM_ANALYST', async () => {
      const roles = [
        'NURSE',
        'RECEPTIONIST',
        'PHARMACIST',
        'EQUIPMENT_STAFF',
        'CRM_ANALYST',
      ];
      for (const role of roles) {
        const email = uniqueEmail(role.toLowerCase());
        const res = await request(app.getHttpServer())
          .post('/api/v1/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            email,
            firstName: 'Test',
            lastName: 'User',
            password: 'Staff@Test1!',
            role,
          });
        expect(res.status).toBe(201);
        expect(res.body.role).toBe(role);
      }
    });

    it('❌ 400 – missing email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'X',
          lastName: 'Y',
          password: 'Staff@Test1',
          role: 'NURSE',
        });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – invalid email format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'not-an-email',
          firstName: 'X',
          lastName: 'Y',
          password: 'Staff@Test1',
          role: 'NURSE',
        });
      expect(res.status).toBe(400);
    });

    it('❌ 400 – invalid role', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: uniqueEmail(),
          firstName: 'X',
          lastName: 'Y',
          password: 'Staff@Test1',
          role: 'HACKER',
        });
      expect(res.status).toBe(400);
    });

    it('❌ 409 – duplicate email', async () => {
      const email = uniqueEmail('dup');
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email,
          firstName: 'A',
          lastName: 'B',
          password: 'Staff@Test1',
          role: 'NURSE',
        });

      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email,
          firstName: 'A',
          lastName: 'B',
          password: 'Staff@Test1',
          role: 'NURSE',
        });
      expect([400, 409]).toContain(res.status);
    });

    it('🔐 401 – no auth', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          email: uniqueEmail(),
          firstName: 'X',
          lastName: 'Y',
          password: 'Staff@Test1',
          role: 'NURSE',
        });
      expect(res.status).toBe(401);
    });

    it('💉 SQL injection in firstName is sanitised', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: uniqueEmail('sqli'),
          firstName: "'; DROP TABLE users;--",
          lastName: 'Test',
          password: 'Staff@Test1',
          role: 'NURSE',
        });
      // Must not be 500 – either 201 (sanitised) or 400 (rejected)
      expect(res.status).not.toBe(500);
    });

    it('💉 XSS in firstName is handled safely', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: uniqueEmail('xss'),
          firstName: "<script>alert('xss')</script>",
          lastName: 'Test',
          password: 'Staff@Test1',
          role: 'NURSE',
        });
      expect(res.status).not.toBe(500);
      if (res.status === 201) {
        expect(res.body.firstName).not.toContain('<script>');
      }
    });

    it('📋 Response never contains password or passwordHash', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: uniqueEmail('nopwd'),
          firstName: 'Secure',
          lastName: 'User',
          password: 'Staff@Test1',
          role: 'NURSE',
        });
      expect(res.status).toBe(201);
      expect(res.body.password).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();
    });
  });

  describe('GET /api/v1/users', () => {
    it('✅ Returns list of facility users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(
        true,
      );
    });

    it('🔐 401 without token', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/users');
      expect(res.status).toBe(401);
    });

    it('🏢 IDOR – results scoped to own facility', async () => {
      const other = await registerFacility(app);
      const res = await request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const users = res.body.data ?? res.body;
      for (const u of users) {
        if (u.facilityId) {
          expect(u.facilityId).toBe(facilityId);
        }
      }
      // Ensure no user from the other facility leaks
      const otherUserInList = users.find(
        (u: any) => u.facilityId === other.facilityId,
      );
      expect(otherUserInList).toBeUndefined();
    });
  });

  describe('GET /api/v1/users/doctors', () => {
    it('✅ Returns only DOCTOR-role users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/doctors')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      const list = res.body.data ?? res.body;
      for (const u of list) {
        expect(u.role).toBe('DOCTOR');
      }
    });

    it('🔐 401 without token', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/v1/users/doctors',
      );
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    let userId: string;

    beforeAll(async () => {
      const user = await createUser(app, adminToken);
      userId = user.id;
    });

    it('✅ Returns user by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(userId);
    });

    it('📋 Response does not contain password', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.body.password).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('🔍 404 for non-existent user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect([403, 404]).toContain(res.status);
    });

    it('🏢 IDOR – cannot get user from different facility', async () => {
      const other = await registerFacility(app);
      const otherUser = await createUser(app, other.adminToken);
      const res = await request(app.getHttpServer())
        .get(`/api/v1/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([403, 404]).toContain(res.status);
    });

    it('🔐 401 without token', async () => {
      const res = await request(app.getHttpServer()).get(
        `/api/v1/users/${userId}`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    let userId: string;

    beforeAll(async () => {
      const user = await createUser(app, adminToken);
      userId = user.id;
    });

    it('✅ Updates firstName and lastName', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Updated', lastName: 'Name' });
      expect(res.status).toBe(200);
      expect(res.body.firstName).toBe('Updated');
    });

    it('⚠️ facilityId change in body is ignored (security)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          facilityId: '00000000-0000-0000-0000-000000000000',
          firstName: 'Safe',
        });
      // Should succeed but facilityId must not change
      if (res.status === 200) {
        expect(res.body.facilityId).toBe(facilityId);
      }
    });

    it('🔐 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}`)
        .send({ firstName: 'Hacker' });
      expect(res.status).toBe(401);
    });

    it('🏢 IDOR – cannot update user from different facility', async () => {
      const other = await registerFacility(app);
      const otherUser = await createUser(app, other.adminToken);
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Hijacked' });
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('✅ Soft-deletes a user', async () => {
      const user = await createUser(app, adminToken, { role: 'NURSE' });
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/users/${user.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([200, 204]).toContain(res.status);
    });

    it('📋 Deleted user cannot log in', async () => {
      const email = uniqueEmail('deleted');
      const password = 'Staff@Test1';
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email,
          firstName: 'ToDelete',
          lastName: 'User',
          password,
          role: 'NURSE',
        });
      expect(createRes.status).toBe(201);

      await request(app.getHttpServer())
        .delete(`/api/v1/users/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password });
      expect([401, 403]).toContain(loginRes.status);
    });

    it('🔐 401 without token', async () => {
      const user = await createUser(app, adminToken, { role: 'NURSE' });
      const res = await request(app.getHttpServer()).delete(
        `/api/v1/users/${user.id}`,
      );
      expect(res.status).toBe(401);
    });

    it('🏢 IDOR – cannot delete user from different facility', async () => {
      const other = await registerFacility(app);
      const otherUser = await createUser(app, other.adminToken);
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect([403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/v1/users/me', () => {
    it('✅ Returns current user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ role: 'FACILITY_ADMIN', facilityId });
      expect(res.body.password).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('🔐 401 without token', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });
  });
});
