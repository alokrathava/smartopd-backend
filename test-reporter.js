/**
 * SmartOPD — Custom Jest Reporter
 *
 * Works in two modes:
 *   • Single-project run  (npm test / npm run test:e2e)
 *   • Combined-project run (npm run test:all) — shows UNIT vs E2E breakdown
 *
 * Output files (always written to test-results/):
 *   report.json   — full machine-readable results
 *   summary.txt   — human-readable summary (also printed to console)
 *
 * No extra npm packages required.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const RESULTS_DIR = path.join(process.cwd(), 'test-results');

// ─── helpers ──────────────────────────────────────────────────────────────────

function pad(str, len)  { return String(str).padEnd(len); }
function lpad(str, len) { return String(str).padStart(len); }
function bar(char, len) { return char.repeat(len); }

/** Detect whether a suite path belongs to UNIT or E2E based on its path */
function suiteType(suitePath) {
  if (suitePath.includes('e2e-spec')) return 'E2E';
  if (suitePath.includes(`${path.sep}test${path.sep}`) ||
      suitePath.startsWith('test' + path.sep)) return 'E2E';
  return 'UNIT';
}

// ─── Reporter class ───────────────────────────────────────────────────────────

class SmartOPDReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options      = options || {};
  }

  onRunComplete(_contexts, results) {
    // Ensure output dir exists
    fs.mkdirSync(RESULTS_DIR, { recursive: true });

    const timestamp = new Date().toISOString();
    const runDate   = timestamp.split('T')[0];
    const runTime   = timestamp.split('T')[1].replace(/\..+/, '');

    // ── Build per-suite data ────────────────────────────────────────────────

    const suites = results.testResults.map((suite) => {
      const tests = suite.testResults.map((t) => ({
        title          : t.fullName,
        ancestorTitles : t.ancestorTitles,
        status         : t.status,   // passed | failed | pending | skipped
        duration       : t.duration ?? 0,
        failureMessages: t.failureMessages,
      }));

      const relPath = path.relative(process.cwd(), suite.testFilePath);

      return {
        suitePath : relPath,
        type      : suiteType(relPath),          // 'UNIT' or 'E2E'
        status    : suite.status,
        duration  : suite.perfStats
                      ? suite.perfStats.end - suite.perfStats.start
                      : 0,
        tests,
        numPassed : tests.filter(t => t.status === 'passed').length,
        numFailed : tests.filter(t => t.status === 'failed').length,
        numPending: tests.filter(t => t.status === 'pending').length,
        numSkipped: tests.filter(t => t.status === 'skipped').length,
      };
    });

    // ── Overall summary numbers ─────────────────────────────────────────────

    const totalDurationMs = results.testResults.reduce(
      (acc, s) => acc + (s.perfStats ? s.perfStats.end - s.perfStats.start : 0), 0
    );

    // ── Per-type breakdown (UNIT / E2E) ─────────────────────────────────────

    const byType = {};
    for (const s of suites) {
      if (!byType[s.type]) {
        byType[s.type] = {
          suites: 0, suitesPassed: 0, suitesFailed: 0,
          tests: 0,  passed: 0, failed: 0, pending: 0, skipped: 0,
          durationMs: 0,
        };
      }
      const g = byType[s.type];
      g.suites++;
      if (s.numFailed > 0 || s.status === 'failed') g.suitesFailed++; else g.suitesPassed++;
      g.tests   += s.tests.length;
      g.passed  += s.numPassed;
      g.failed  += s.numFailed;
      g.pending += s.numPending;
      g.skipped += s.numSkipped;
      g.durationMs += s.duration;
    }

    // ── Full JSON report ────────────────────────────────────────────────────

    const report = {
      meta: {
        timestamp,
        runDate,
        runTime,
        rootDir: this._globalConfig.rootDir,
        mode: Object.keys(byType).length > 1 ? 'combined' : Object.keys(byType)[0] || 'unit',
      },
      summary: {
        numTotalTestSuites : results.numTotalTestSuites,
        numPassedTestSuites: results.numPassedTestSuites,
        numFailedTestSuites: results.numFailedTestSuites,
        numTotalTests      : results.numTotalTests,
        numPassedTests     : results.numPassedTests,
        numFailedTests     : results.numFailedTests,
        numPendingTests    : results.numPendingTests,
        numTodoTests       : results.numTodoTests || 0,
        success            : results.success,
        durationMs         : totalDurationMs,
      },
      byType,
      suites,
      failedTests: suites.flatMap(s =>
        s.tests
          .filter(t => t.status === 'failed')
          .map(t => ({
            type   : s.type,
            suite  : s.suitePath,
            title  : t.title,
            duration: t.duration,
            failureMessages: t.failureMessages,
          }))
      ),
    };

    const jsonFile = path.join(RESULTS_DIR, 'report.json');
    fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2), 'utf8');

    // ── Human-readable summary ──────────────────────────────────────────────

    const W   = 66;
    const DIV = '─'.repeat(W);
    const TOP = '═'.repeat(W);

    const lines = [
      TOP,
      `  SmartOPD — Test Report`,
      `  ${runDate}  ${runTime} UTC`,
      TOP,
      '',
    ];

    // Overall totals
    const { summary: S } = report;
    lines.push(
      `  ${'Suites'.padEnd(10)} ${lpad(S.numPassedTestSuites, 4)} passed   ` +
      `${lpad(S.numFailedTestSuites, 3)} failed   ` +
      `${lpad(S.numTotalTestSuites, 3)} total`,
    );
    lines.push(
      `  ${'Tests'.padEnd(10)} ${lpad(S.numPassedTests, 4)} passed   ` +
      `${lpad(S.numFailedTests, 3)} failed   ` +
      `${lpad(S.numTotalTests, 3)} total` +
      (S.numPendingTests > 0 ? `   ${S.numPendingTests} skipped` : ''),
    );
    lines.push(
      `  ${'Duration'.padEnd(10)} ${(totalDurationMs / 1000).toFixed(2)}s`,
    );
    lines.push(
      `  ${'Status'.padEnd(10)} ${S.success ? '✅  ALL PASSED' : '❌  FAILURES DETECTED'}`,
    );
    lines.push('');

    // Per-type breakdown when running combined (UNIT + E2E)
    const types = Object.keys(byType);
    if (types.length > 1) {
      lines.push(`  ${DIV}`);
      lines.push(`  Breakdown by type`);
      lines.push(`  ${DIV}`);
      for (const type of types) {
        const g = byType[type];
        const statusIcon = g.failed === 0 ? '✅' : '❌';
        lines.push(`  ${statusIcon}  [${type}]`);
        lines.push(
          `      Suites : ${g.suitesPassed} passed, ${g.suitesFailed} failed, ${g.suites} total`,
        );
        lines.push(
          `      Tests  : ${g.passed} passed, ${g.failed} failed, ${g.pending} skipped, ${g.tests} total`,
        );
        lines.push(
          `      Time   : ${(g.durationMs / 1000).toFixed(2)}s`,
        );
        lines.push('');
      }
    }

    // Failed test detail
    if (report.failedTests.length > 0) {
      lines.push(`  ${DIV}`);
      lines.push(`  ❌  Failed Tests (${report.failedTests.length})`);
      lines.push(`  ${DIV}`);
      for (const f of report.failedTests) {
        lines.push(`  [${f.type}]  ${f.suite}`);
        lines.push(`    ✗  ${f.title}`);
        if (f.failureMessages.length > 0) {
          const msg = f.failureMessages[0]
            .split('\n')
            .filter(Boolean)
            .slice(0, 4)
            .map(l => `       ${l.trim()}`)
            .join('\n');
          lines.push(msg);
        }
        lines.push('');
      }
    }

    // Suite-by-suite table
    lines.push(`  ${DIV}`);
    lines.push(`  Suite Results`);
    lines.push(`  ${DIV}`);

    // Group by type for cleaner display
    for (const type of types) {
      const typeSuites = suites.filter(s => s.type === type);
      if (typeSuites.length === 0) continue;

      lines.push(`  ▸ ${type} (${typeSuites.length} suites)`);
      for (const s of typeSuites) {
        const icon = s.numFailed > 0 || s.status === 'failed' ? '✗' : s.numPassed === 0 ? '○' : '✓';
        const name = s.suitePath.replace(/\\/g, '/');
        // Trim long paths
        const displayName = name.length > 52 ? '…' + name.slice(-51) : name;
        lines.push(
          `    ${icon} ${pad(displayName, 53)}` +
          `${lpad(s.numPassed, 3)}✓  ${lpad(s.numFailed, 2)}✗`,
        );
      }
      lines.push('');
    }

    lines.push(`  Full JSON: test-results/report.json`);
    lines.push('═'.repeat(W));

    const summary    = lines.join('\n');
    const summaryFile = path.join(RESULTS_DIR, 'summary.txt');
    fs.writeFileSync(summaryFile, summary, 'utf8');

    console.log('\n' + summary);
  }
}

module.exports = SmartOPDReporter;
