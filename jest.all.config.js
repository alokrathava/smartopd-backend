/**
 * SmartOPD — Combined Jest Config
 *
 * Runs UNIT tests (src/**\/*.spec.ts) and E2E tests (test/**\/*.e2e-spec.ts)
 * in a single pass using Jest's `projects` feature.
 *
 * Usage:
 *   npm run test:all            — run all tests, save report
 *   npm run test:all:cov        — run all tests + coverage
 *   npm run test:all:full-e2e   — includes DB/Redis E2E (needs MySQL + Redis)
 *
 * E2E auth flow (register → activate → login) requires MySQL + Redis.
 * It is skipped by default. To enable:
 *   TEST_E2E_SKIP=false npm run test:all
 */

'use strict';

module.exports = {
  // ── Projects (runs both in parallel) ──────────────────────────────────────

  projects: [
    // ── 1. Unit tests ────────────────────────────────────────────────────────
    {
      displayName: { name: 'UNIT', color: 'cyan' },
      rootDir: '<rootDir>/src',
      testRegex: '.*\\.spec\\.ts$',
      transform: { '^.+\\.(t|j)s$': 'ts-jest' },
      moduleFileExtensions: ['js', 'json', 'ts'],
      testEnvironment: 'node',
      transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
    },

    // ── 2. E2E tests ─────────────────────────────────────────────────────────
    {
      displayName: { name: 'E2E', color: 'magenta' },
      rootDir: '<rootDir>/test',
      testRegex: '\\.e2e-spec\\.ts$',
      transform: { '^.+\\.(t|j)s$': 'ts-jest' },
      moduleFileExtensions: ['js', 'json', 'ts'],
      testEnvironment: 'node',
      transformIgnorePatterns: ['node_modules/(?!(uuid)/)'],
    },
  ],

  // ── Reporter ───────────────────────────────────────────────────────────────
  // Saves test-results/report.json + test-results/summary.txt after every run

  reporters: [
    'default',
    ['<rootDir>/test-reporter.js', { mode: 'all' }],
  ],

  // ── Coverage ───────────────────────────────────────────────────────────────
  // Only collect from src (not test helpers)

  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.spec.ts',
    '!<rootDir>/src/**/*.module.ts',
    '!<rootDir>/src/main.ts',
    '!<rootDir>/src/migrations/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],

  // ── Global options ─────────────────────────────────────────────────────────

  forceExit: true,          // prevents open Redis/Bull handles from hanging
  detectOpenHandles: false,
  testTimeout: 30000,       // 30s per test — allows async DB ops in E2E
  verbose: false,           // set true to see every test name in terminal
};
