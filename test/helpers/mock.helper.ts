/**
 * mock.helper.ts
 *
 * Centralised mocks for all external APIs that SmartOPD calls.
 *
 * Strategy: we use jest.spyOn against the HttpService (Axios under the hood)
 * to intercept outbound HTTP calls rather than spinning up nock interceptors.
 * This approach works regardless of the Node fetch/http adapter because NestJS
 * always proxies external requests through @nestjs/axios HttpService.
 *
 * Usage in a spec file:
 *
 *   import {
 *     mockAbdmGateway,
 *     mockNhcxGateway,
 *     mockLabPartners,
 *     mockNotificationProviders,
 *     restoreAllMocks,
 *   } from '../helpers/mock.helper.js';
 *
 *   beforeEach(() => {
 *     mockAbdmGateway();
 *     mockNotificationProviders();
 *   });
 *   afterEach(() => restoreAllMocks());
 */

import { of } from 'rxjs';
import type { AxiosResponse } from 'axios';

// ──────────────────────────────────────────────────────────────────────────────
// Internal registry of all active spies so restoreAllMocks() can clean them up
// ──────────────────────────────────────────────────────────────────────────────

const activeSpies: jest.SpyInstance[] = [];

function track(spy: jest.SpyInstance): jest.SpyInstance {
  activeSpies.push(spy);
  return spy;
}

// ──────────────────────────────────────────────────────────────────────────────
// Axios response factory — builds a minimal AxiosResponse-shaped object
// ──────────────────────────────────────────────────────────────────────────────

function axiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: 'OK',
    headers: { 'content-type': 'application/json' },
    config: {
      headers: {} as any,
      url: '',
      method: 'post',
    },
    request: {},
  } as unknown as AxiosResponse<T>;
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers to resolve HttpService from the NestJS app (lazy — only called when
// actually setting up mocks)
// ──────────────────────────────────────────────────────────────────────────────

let _httpService: any = null;

/**
 * Lazily resolves the HttpService singleton from the test app.
 * Requires the app to be initialised via initApp() first.
 */
async function getHttpService(): Promise<any> {
  if (_httpService) return _httpService;
  const { getApp } = await import('./app.setup.js');
  const app = getApp();
  const { HttpService } = await import('@nestjs/axios');
  _httpService = app.get<typeof HttpService>(HttpService as any);
  return _httpService;
}

// ──────────────────────────────────────────────────────────────────────────────
// ABDM Gateway mocks
// ──────────────────────────────────────────────────────────────────────────────

export interface AbdmMockHandles {
  sessionSpy: jest.SpyInstance;
  generateOtpSpy: jest.SpyInstance;
  verifyOtpSpy: jest.SpyInstance;
  userAuthInitSpy: jest.SpyInstance;
  userAuthConfirmSpy: jest.SpyInstance;
  consentInitSpy: jest.SpyInstance;
}

/**
 * Mocks the ABDM gateway HTTP calls.
 * Works even when ABDM_CLIENT_ID is set — overrides HttpService.post/get.
 *
 * Returns the mock spy handles so tests can inspect call counts.
 */
export async function mockAbdmGateway(): Promise<AbdmMockHandles> {
  const svc = await getHttpService();

  const sessionSpy = track(
    jest
      .spyOn(svc.axiosRef ?? svc, 'post')
      .mockImplementation((url: string, data: any, config?: any) => {
        // ── Session (auth) ────────────────────────────────────────────────────
        if (url.includes('/v0.5/sessions') || url.includes('/sessions')) {
          return Promise.resolve(
            axiosResponse({
              accessToken: 'mock-abdm-access-token',
              expiresIn: 3600,
              tokenType: 'bearer',
            }),
          );
        }

        // ── M1: Generate Aadhaar OTP ──────────────────────────────────────────
        if (url.includes('/v1/registration/aadhaar/generateOtp')) {
          return Promise.resolve(axiosResponse({ txnId: 'mock-abdm-txn-001' }));
        }

        // ── M1: Verify Aadhaar OTP ────────────────────────────────────────────
        if (url.includes('/v1/registration/aadhaar/verifyOTP')) {
          return Promise.resolve(
            axiosResponse({
              healthIdNumber: '91-1234-5678-9012',
              healthId: 'testpatient@abdm',
              name: 'Test Patient',
              gender: 'M',
              yearOfBirth: '1990',
              mobile: '9876543210',
            }),
          );
        }

        // ── M2: User Auth Init ────────────────────────────────────────────────
        if (
          url.includes('/v0.5/users/auth/init') ||
          url.includes('/hip/link/user-auth/init')
        ) {
          return Promise.resolve(
            axiosResponse({ requestId: 'mock-request-id' }),
          );
        }

        // ── M2: User Auth Confirm ─────────────────────────────────────────────
        if (url.includes('/v0.5/users/auth/confirm')) {
          return Promise.resolve(
            axiosResponse({ accessToken: 'mock-patient-token' }),
          );
        }

        // ── M3: Consent Init ──────────────────────────────────────────────────
        if (url.includes('/v0.5/consent-requests/init')) {
          return Promise.resolve(
            axiosResponse({ consentRequestId: 'mock-consent-001' }),
          );
        }

        // Fallthrough — let other calls pass through unmocked
        return Promise.reject(
          new Error(`[mockAbdmGateway] Unexpected ABDM URL: ${url}`),
        );
      }),
  );

  // Split the spy by URL pattern for individual assertion convenience
  // (they all share sessionSpy.mock above — the others are logical aliases)
  const generateOtpSpy = sessionSpy;
  const verifyOtpSpy = sessionSpy;
  const userAuthInitSpy = sessionSpy;
  const userAuthConfirmSpy = sessionSpy;
  const consentInitSpy = sessionSpy;

  return {
    sessionSpy,
    generateOtpSpy,
    verifyOtpSpy,
    userAuthInitSpy,
    userAuthConfirmSpy,
    consentInitSpy,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// NHCX Gateway mocks
// ──────────────────────────────────────────────────────────────────────────────

export interface NhcxMockHandles {
  submitSpy: jest.SpyInstance;
  statusSpy: jest.SpyInstance;
}

/**
 * Mocks NHCX claim submission and status check endpoints.
 */
export async function mockNhcxGateway(): Promise<NhcxMockHandles> {
  const svc = await getHttpService();

  const submitSpy = track(
    jest
      .spyOn(svc.axiosRef ?? svc, 'post')
      .mockImplementation((url: string) => {
        if (
          url.includes('/claim/submit') ||
          url.includes('/nhcx') ||
          url.includes('nhcx.abdm.gov.in')
        ) {
          return Promise.resolve(
            axiosResponse({
              claimId: `NHCX-MOCK-${Date.now()}`,
              status: 'RECEIVED',
              message: 'Claim received successfully (mock)',
              timestamp: new Date().toISOString(),
            }),
          );
        }
        return Promise.reject(
          new Error(`[mockNhcxGateway] Unexpected URL: ${url}`),
        );
      }),
  );

  const statusSpy = track(
    jest.spyOn(svc.axiosRef ?? svc, 'get').mockImplementation((url: string) => {
      if (url.includes('/claim/') && url.includes('/status')) {
        return Promise.resolve(
          axiosResponse({
            claimId: url.split('/claim/')[1]?.split('/')[0] ?? 'MOCK',
            status: 'UNDER_PROCESSING',
            message: 'Mock status check response',
          }),
        );
      }
      return Promise.reject(
        new Error(`[mockNhcxGateway] Unexpected GET URL: ${url}`),
      );
    }),
  );

  return { submitSpy, statusSpy };
}

// ──────────────────────────────────────────────────────────────────────────────
// Lab Partner mocks (SRL, Thyrocare, Dr. Lal, Metropolis)
// ──────────────────────────────────────────────────────────────────────────────

export interface LabMockHandles {
  srlSpy: jest.SpyInstance;
  thyrocareSpy: jest.SpyInstance;
  webhookSpy: jest.SpyInstance;
}

/**
 * Mocks outbound HTTP calls to lab partners.
 */
export async function mockLabPartners(): Promise<LabMockHandles> {
  const svc = await getHttpService();

  const labOrderResponse = (partner: string) =>
    axiosResponse({
      orderId: `${partner}-ORDER-${Date.now()}`,
      id: `${partner}-${Date.now()}`,
      status: 'RECEIVED',
      estimatedTat: '6 hours',
      collectionDate: new Date().toISOString(),
    });

  const srlSpy = track(
    jest
      .spyOn(svc.axiosRef ?? svc, 'post')
      .mockImplementation((url: string) => {
        if (url.includes('srl.in') || url.includes('api.srl')) {
          return Promise.resolve(labOrderResponse('SRL'));
        }
        if (url.includes('thyrocare') || url.includes('velso.thyrocare')) {
          return Promise.resolve(labOrderResponse('THYROCARE'));
        }
        if (url.includes('lalpathlabs') || url.includes('metropolisindia')) {
          return Promise.resolve(labOrderResponse('LAB'));
        }
        return Promise.reject(
          new Error(`[mockLabPartners] Unexpected URL: ${url}`),
        );
      }),
  );

  const thyrocareSpy = srlSpy; // Same spy, different URL branch
  const webhookSpy = srlSpy;

  return { srlSpy, thyrocareSpy, webhookSpy };
}

// ──────────────────────────────────────────────────────────────────────────────
// Notification provider mocks (MSG91 SMS, Resend email, Meta WhatsApp)
// ──────────────────────────────────────────────────────────────────────────────

export interface NotificationMockHandles {
  smsSpy: jest.SpyInstance;
  emailSpy: jest.SpyInstance;
  whatsappSpy: jest.SpyInstance;
}

/**
 * Mocks all outbound notification calls.
 *
 * The SmartOPD notification pipeline enqueues jobs via BullMQ workers which
 * themselves call external providers.  In E2E tests the worker runs in-process
 * so we need to intercept the HTTP calls it makes.
 */
export async function mockNotificationProviders(): Promise<NotificationMockHandles> {
  const svc = await getHttpService();

  const smsSpy = track(
    jest
      .spyOn(svc.axiosRef ?? svc, 'post')
      .mockImplementation((url: string, data: any) => {
        // MSG91 SMS
        if (url.includes('msg91') || url.includes('control.msg91.com')) {
          return Promise.resolve(
            axiosResponse({
              type: 'success',
              message: '1 SMS submitted successfully (mock)',
              request_id: `MSG91-MOCK-${Date.now()}`,
            }),
          );
        }

        // Resend email
        if (url.includes('api.resend.com') || url.includes('resend.com')) {
          return Promise.resolve(
            axiosResponse({
              id: `re_MOCK_${Date.now()}`,
              from: data?.from ?? 'noreply@smartopd.in',
              to: data?.to,
              created_at: new Date().toISOString(),
            }),
          );
        }

        // Meta WhatsApp Business API
        if (
          url.includes('graph.facebook.com') ||
          url.includes('meta.com/whatsapp')
        ) {
          return Promise.resolve(
            axiosResponse({
              messaging_product: 'whatsapp',
              contacts: [{ input: data?.to, wa_id: data?.to }],
              messages: [{ id: `wamid.MOCK.${Date.now()}` }],
            }),
          );
        }

        return Promise.reject(
          new Error(
            `[mockNotificationProviders] Unexpected notification URL: ${url}`,
          ),
        );
      }),
  );

  const emailSpy = smsSpy;
  const whatsappSpy = smsSpy;

  return { smsSpy, emailSpy, whatsappSpy };
}

// ──────────────────────────────────────────────────────────────────────────────
// Redis mock (for test environments where Redis is unavailable)
// ──────────────────────────────────────────────────────────────────────────────

export interface RedisMockHandles {
  getSpy: jest.SpyInstance;
  setSpy: jest.SpyInstance;
  delSpy: jest.SpyInstance;
  setexSpy: jest.SpyInstance;
  existsSpy: jest.SpyInstance;
}

/**
 * Mocks the injected Redis client ('REDIS_CLIENT') with an in-memory Map.
 *
 * This is only needed when Redis is not running in CI.  When Redis is
 * available (recommended for full E2E), skip this mock.
 */
export async function mockRedisClient(): Promise<RedisMockHandles> {
  const { getApp } = await import('./app.setup.js');
  const app = getApp();

  let redisClient: any;
  try {
    redisClient = app.get<any>('REDIS_CLIENT');
  } catch {
    // REDIS_CLIENT not registered — nothing to mock
    return {
      getSpy: jest.fn() as any,
      setSpy: jest.fn() as any,
      delSpy: jest.fn() as any,
      setexSpy: jest.fn() as any,
      existsSpy: jest.fn() as any,
    };
  }

  const store = new Map<string, string>();

  const getSpy = track(
    jest.spyOn(redisClient, 'get').mockImplementation(async (key: string) => {
      return store.get(key) ?? null;
    }),
  );

  const setSpy = track(
    jest
      .spyOn(redisClient, 'set')
      .mockImplementation(async (key: string, value: string) => {
        store.set(key, value);
        return 'OK';
      }),
  );

  const setexSpy = track(
    jest
      .spyOn(redisClient, 'setex')
      .mockImplementation(async (key: string, _ttl: number, value: string) => {
        store.set(key, value);
        return 'OK';
      }),
  );

  const delSpy = track(
    jest.spyOn(redisClient, 'del').mockImplementation(async (key: string) => {
      store.delete(key);
      return 1;
    }),
  );

  const existsSpy = track(
    jest
      .spyOn(redisClient, 'exists')
      .mockImplementation(async (key: string) => {
        return store.has(key) ? 1 : 0;
      }),
  );

  return { getSpy, setSpy, delSpy, setexSpy, existsSpy };
}

// ──────────────────────────────────────────────────────────────────────────────
// Convenience: mock everything at once
// ──────────────────────────────────────────────────────────────────────────────

export interface AllMockHandles {
  abdm: AbdmMockHandles;
  nhcx: NhcxMockHandles;
  lab: LabMockHandles;
  notifications: NotificationMockHandles;
}

/**
 * Activates all external API mocks in one call.
 *
 * Usage:
 *   let mocks: AllMockHandles;
 *   beforeEach(async () => { mocks = await mockAllExternalApis(); });
 *   afterEach(() => restoreAllMocks());
 */
export async function mockAllExternalApis(): Promise<AllMockHandles> {
  const [abdm, nhcx, lab, notifications] = await Promise.all([
    mockAbdmGateway(),
    mockNhcxGateway(),
    mockLabPartners(),
    mockNotificationProviders(),
  ]);
  return { abdm, nhcx, lab, notifications };
}

// ──────────────────────────────────────────────────────────────────────────────
// Restore
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Restores all Jest spies registered via the track() helper.
 * Call this in afterEach() or afterAll().
 */
export function restoreAllMocks(): void {
  for (const spy of activeSpies) {
    spy.mockRestore();
  }
  activeSpies.length = 0;
  _httpService = null; // force re-resolve on next call
}
