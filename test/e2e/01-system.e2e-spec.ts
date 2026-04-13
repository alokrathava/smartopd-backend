/**
 * E2E Test Suite: 01 - System / Health Endpoint
 *
 * Covers GET /api/v1  (AppController.getHealth — @Public)
 *
 * Categories:
 *  ✅ Happy path
 *  🔐 Authentication (public — no token needed, even invalid tokens work)
 *  ⚡ Response-time SLA
 *  📋 Compliance (timestamp format, docs link)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

// ---------------------------------------------------------------------------
// Module bootstrap helper — mirrors main.ts setup so guards / pipes apply
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
function isIso8601(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime()) && value === d.toISOString();
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------
describe('System / Health — GET /api/v1', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  }, 90_000);

  afterAll(async () => {
    await app.close();
  });

  // ── 200 Happy path ─────────────────────────────────────────────────────────

  it('✅ returns HTTP 200', async () => {
    await request(app.getHttpServer()).get('/api/v1').expect(200);
  });

  it('✅ Content-Type is application/json', async () => {
    await request(app.getHttpServer())
      .get('/api/v1')
      .expect('Content-Type', /application\/json/);
  });

  it('✅ body contains all required fields', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('app');
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('environment');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptimeSeconds');
    expect(body).toHaveProperty('nodeVersion');
    expect(body).toHaveProperty('docs');
  });

  it('✅ status equals "ok"', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    expect(body.status).toBe('ok');
  });

  it('✅ app is a non-empty string', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    expect(typeof body.app).toBe('string');
    expect(body.app.length).toBeGreaterThan(0);
  });

  it('✅ version is a non-empty string', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    expect(typeof body.version).toBe('string');
    expect(body.version.length).toBeGreaterThan(0);
  });

  it('✅ environment is a non-empty string', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    expect(typeof body.environment).toBe('string');
    expect(body.environment.length).toBeGreaterThan(0);
  });

  it('✅ docs equals "/api/docs"', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    expect(body.docs).toBe('/api/docs');
  });

  it('✅ uptimeSeconds is a non-negative number', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    expect(typeof body.uptimeSeconds).toBe('number');
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    // Should be an integer (Math.floor was applied)
    expect(Number.isInteger(body.uptimeSeconds)).toBe(true);
  });

  it('✅ timestamp is a valid ISO 8601 UTC string', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    expect(isIso8601(body.timestamp)).toBe(true);
  });

  it('✅ timestamp is close to the current time (within 5 seconds)', async () => {
    const before = Date.now();
    const { body } = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);
    const after = Date.now();

    const ts = new Date(body.timestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before - 5000);
    expect(ts).toBeLessThanOrEqual(after + 5000);
  });

  it('✅ nodeVersion matches the running Node process', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    expect(body.nodeVersion).toBe(process.version);
  });

  // ── Authentication — @Public endpoint ──────────────────────────────────────

  it('🔐 responds 200 without any Authorization header', async () => {
    await request(app.getHttpServer()).get('/api/v1').expect(200);
  });

  it('🔐 responds 200 with an invalid Authorization header (does NOT 401)', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1')
      .set('Authorization', 'Bearer this.is.totally.invalid')
      .expect(200);

    expect(body.status).toBe('ok');
  });

  it('🔐 responds 200 with a malformed Bearer value', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1')
      .set('Authorization', 'NotBearer garbage')
      .expect(200);

    expect(body.status).toBe('ok');
  });

  // ── Response-time SLA ──────────────────────────────────────────────────────

  it('⚡ responds in under 500ms', async () => {
    const start = Date.now();
    await request(app.getHttpServer()).get('/api/v1').expect(200);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(500);
  });

  // ── Structure consistency ──────────────────────────────────────────────────

  it('✅ response shape is stable across two consecutive calls', async () => {
    const { body: first } = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    const { body: second } = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    // Keys must be identical
    expect(Object.keys(first).sort()).toEqual(Object.keys(second).sort());
    // Static fields must be identical
    expect(first.status).toBe(second.status);
    expect(first.app).toBe(second.app);
    expect(first.version).toBe(second.version);
    expect(first.docs).toBe(second.docs);
    expect(first.nodeVersion).toBe(second.nodeVersion);
    // uptimeSeconds in the second call must be >= first call
    expect(second.uptimeSeconds).toBeGreaterThanOrEqual(first.uptimeSeconds);
  });

  // ── Compliance ─────────────────────────────────────────────────────────────

  it('📋 docs field links to the Swagger UI path', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    // Must start with "/" and contain "docs"
    expect(body.docs).toMatch(/^\/.*docs/i);
  });

  it('📋 response does not leak sensitive fields (no db credentials, secrets)', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/api/v1')
      .expect(200);

    const bodyStr = JSON.stringify(body).toLowerCase();
    expect(bodyStr).not.toContain('password');
    expect(bodyStr).not.toContain('secret');
    expect(bodyStr).not.toContain('db_');
    expect(bodyStr).not.toContain('jwt_');
  });
});
