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
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import supertestLib from 'supertest';
import type { SuperTest, Test as SupertestTest } from 'supertest';
import { join } from 'path';
import { mkdirSync } from 'fs';
import helmet from 'helmet';
import compression from 'compression';

// ──────────────────────────────────────────────────────────────────────────────
// Inject test environment variables BEFORE AppModule is imported/compiled so
// that ConfigService picks them up without needing a real .env.test file on disk.
// ──────────────────────────────────────────────────────────────────────────────
function applyTestEnv(): void {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';

  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || '3306';
  process.env.DB_USERNAME = process.env.DB_USERNAME || 'root';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
  process.env.DB_NAME = process.env.DB_NAME || 'smartopd_test';

  process.env.JWT_SECRET =
    process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

  process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
  process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';

  process.env.THROTTLE_TTL = process.env.THROTTLE_TTL || '60000';
  process.env.THROTTLE_LIMIT = process.env.THROTTLE_LIMIT || '10000';

  process.env.ABDM_CLIENT_ID = process.env.ABDM_CLIENT_ID || '';
  process.env.ABDM_CLIENT_SECRET = process.env.ABDM_CLIENT_SECRET || '';
  process.env.NHCX_CLIENT_ID = process.env.NHCX_CLIENT_ID || '';
  process.env.LAB_SRL_API_KEY = process.env.LAB_SRL_API_KEY || '';
  process.env.LAB_THYROCARE_API_KEY = process.env.LAB_THYROCARE_API_KEY || '';
}

// Apply immediately when this module is first imported
applyTestEnv();

// Lazy import AFTER env is set so ConfigService gets the right values

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

  // Ensure upload directories exist (same as main.ts)
  mkdirSync(join(process.cwd(), 'uploads', 'logos'), { recursive: true });

  moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const nestApp = moduleRef.createNestApplication<NestExpressApplication>();

  // Mirror the production bootstrap configuration so E2E tests exercise the
  // full middleware stack.
  nestApp.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // relax for test responses
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

  // Import the global exception filter the same way main.ts does
  const { GlobalExceptionFilter } =
    await import('../../src/common/filters/global-exception.filter.js');
  nestApp.useGlobalFilters(new GlobalExceptionFilter());

  await nestApp.init();

  app = nestApp;
  return app;
}

/**
 * Shut down the test application and release all resources (DB pool, Redis, etc.).
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
 * Throws if {@link initApp} has not been called first.
 */
export function getApp(): INestApplication {
  if (!app) {
    throw new Error(
      '[app.setup] getApp() called before initApp(). ' +
        'Make sure globalSetup has been run.',
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
 *
 * Usage:
 *   const res = await request().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
 */
export function request(): SuperTest<SupertestTest> {
  return supertestLib(getHttpServer()) as unknown as SuperTest<SupertestTest>;
}

/**
 * Convenience re-export so specs can do:
 *   import { initApp, closeApp, request } from '../helpers/app.setup.js';
 */
export { applyTestEnv };
