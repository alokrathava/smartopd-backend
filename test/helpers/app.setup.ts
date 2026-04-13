/**
 * app.setup.ts
 *
 * Bootstraps the SmartOPD NestJS application for E2E testing.
 *
 * Lifecycle:
 *   globalSetup  → call initApp()  (creates + starts the app once per suite)
 *   globalTeardown → call closeApp() (tears down cleanly)
 *
 * Every individual spec file should import getApp() / getHttpServer() /
 * request() rather than spinning up its own NestJS instance.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import supertestLib from 'supertest';
import type { SuperTest, Test as SupertestTest } from 'supertest';
import { join } from 'path';
import { mkdirSync } from 'fs';
import helmet from 'helmet';
import compression from 'compression';
import * as dotenv from 'dotenv';
import { GlobalExceptionFilter } from '../../src/common/filters/global-exception.filter';

// ──────────────────────────────────────────────────────────────────────────────
// Load env BEFORE AppModule is imported/compiled so ConfigService sees the
// correct values. Do not silently force localhost DB values if .env exists.
// ──────────────────────────────────────────────────────────────────────────────
function applyTestEnv(): void {
  dotenv.config();

  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  process.env.DB_HOST = process.env.DB_HOST || process.env.DATABASE_HOST || '';
  process.env.DB_PORT = process.env.DB_PORT || process.env.DATABASE_PORT || '';
  process.env.DB_USERNAME =
    process.env.DB_USERNAME || process.env.DATABASE_USERNAME || '';
  process.env.DB_PASSWORD =
    process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || '';
  process.env.DB_NAME = process.env.DB_NAME || process.env.DATABASE_NAME || '';

  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

  // Extended token expiration for E2E tests (default 15m is too short for full suite)
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

  process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
  process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

  process.env.THROTTLE_TTL = process.env.THROTTLE_TTL || '60000';
  process.env.THROTTLE_LIMIT = process.env.THROTTLE_LIMIT || '10000';

  process.env.ABDM_CLIENT_ID = process.env.ABDM_CLIENT_ID || '';
  process.env.ABDM_CLIENT_SECRET = process.env.ABDM_CLIENT_SECRET || '';
  process.env.NHCX_CLIENT_ID = process.env.NHCX_CLIENT_ID || '';
  process.env.LAB_SRL_API_KEY = process.env.LAB_SRL_API_KEY || '';
  process.env.LAB_THYROCARE_API_KEY = process.env.LAB_THYROCARE_API_KEY || '';

  if (
    !process.env.DB_HOST ||
    !process.env.DB_PORT ||
    !process.env.DB_USERNAME ||
    !process.env.DB_NAME
  ) {
    throw new Error(
      '[app.setup] Missing DB environment variables after dotenv load. Check your .env file and variable names.',
    );
  }
}

// Apply immediately when this module is first imported
applyTestEnv();

// Import AppModule only after env is ready
const { AppModule } = require('../../src/app.module') as {
  AppModule: any;
};

// ──────────────────────────────────────────────────────────────────────────────
// Singleton state
// ──────────────────────────────────────────────────────────────────────────────
let app: INestApplication | null = null;
let moduleRef: TestingModule | null = null;

// ──────────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Bootstrap the NestJS test application.
 * Safe to call multiple times — subsequent calls return the cached instance.
 */
export async function initApp(): Promise<INestApplication> {
  if (app) return app;

  mkdirSync(join(process.cwd(), 'uploads', 'logos'), { recursive: true });

  console.log('[E2E DB CONFIG]', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    db: process.env.DB_NAME,
    nodeEnv: process.env.NODE_ENV,
  });

  moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const nestApp = moduleRef.createNestApplication<NestExpressApplication>();

  nestApp.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    }),
  );
  nestApp.use(compression());
  nestApp.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  nestApp.setGlobalPrefix('api/v1');
  nestApp.enableCors({ origin: true, credentials: true });

  nestApp.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  nestApp.useGlobalFilters(new GlobalExceptionFilter());

  await nestApp.init();

  app = nestApp;
  return app;
}

/**
 * Shut down the test application and release all resources.
 */
export async function closeApp(): Promise<void> {
  if (app) {
    await app.close();
    app = null;
    moduleRef = null;
  }
}

/**
 * Returns the live NestJS application instance.
 */
export function getApp(): INestApplication {
  if (!app) {
    throw new Error(
      '[app.setup] getApp() called before initApp(). Make sure initApp() has been run.',
    );
  }
  return app;
}

/**
 * Returns the underlying http.Server used by supertest.
 */
export function getHttpServer(): ReturnType<INestApplication['getHttpServer']> {
  return getApp().getHttpServer();
}

/**
 * Returns a bound supertest agent for the test HTTP server.
 */
export function request(): SuperTest<SupertestTest> {
  return supertestLib(getHttpServer()) as unknown as SuperTest<SupertestTest>;
}

export { applyTestEnv };
