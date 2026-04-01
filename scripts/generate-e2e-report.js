/*
  generate-e2e-report.js
  - Scans `test/` for *.e2e-spec.ts files
  - Extracts `it(...)` descriptions and attempts to find HTTP endpoints used in each test
  - Produces: reports/e2e-report.csv and reports/e2e-report.md

  Usage: node scripts/generate-e2e-report.js
*/

const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function csvEscape(s) {
  if (s === undefined || s === null) return '';
  return '"' + String(s).replace(/"/g, '""') + '"';
}

const root = process.cwd();
const testDir = path.join(root, 'test');
if (!fs.existsSync(testDir)) {
  console.error('test/ directory not found in', root);
  process.exit(1);
}

const allFiles = walk(testDir).filter(f => f.endsWith('.ts'));
const e2eFiles = allFiles.filter(f => f.endsWith('.e2e-spec.ts') || path.basename(f) === 'app.e2e-spec.ts');

const itRegex = /it\s*\(\s*(['"`])([\s\S]*?)\1\s*,/g;
const endpointRegex = /\.\s*(get|post|patch|delete|put)\s*\(\s*(['"`])([\s\S]*?)\2\s*\)/gmi;

const emojiMap = {
  '✅': 'happy',
  '❌': 'validation',
  '🔐': 'auth',
  '🚫': 'authorization',
  '🏢': 'idor',
  '💉': 'security',
  '⚡': 'performance',
  '📋': 'compliance',
  '🔍': 'search',
  '⚠️': 'edge',
  '🔄': 'resilience'
};

let totalTests = 0;
const perFile = [];
const csvRows = [];
const categoryCounts = {};
const endpointCounts = {};

function extractEndpointsFromSnippet(snippet) {
  const out = new Set();
  let m;
  while ((m = endpointRegex.exec(snippet)) !== null) {
    const method = (m[1] || '').toUpperCase();
    let route = (m[3] || '').trim().replace(/\s+/g, ' ');
    // Normalize template expressions slightly
    route = route.replace(/\s*\+\s*/g, '');
    out.add(method + ' ' + route);
  }
  return Array.from(out);
}

for (const f of e2eFiles) {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const src = fs.readFileSync(f, 'utf8');
  const tests = [];
  let match;
  while ((match = itRegex.exec(src)) !== null) {
    tests.push({ desc: match[2].trim(), index: match.index });
  }

  totalTests += tests.length;
  perFile.push({ file: rel, tests: tests.length });

  // For each test, search for endpoints within the test block
  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const start = t.index;
    const end = (i + 1 < tests.length) ? tests[i + 1].index : src.length;
    const snippet = src.slice(start, end);
    let endpoints = extractEndpointsFromSnippet(snippet);

    // fallback: look slightly before the test (prelude), in case helpers are called from helper functions
    if (endpoints.length === 0) {
      const preStart = Math.max(0, start - 1200);
      const preSnippet = src.slice(preStart, start);
      endpoints = extractEndpointsFromSnippet(preSnippet);
    }

    // fallback: search the whole file and choose nearest endpoint before test
    if (endpoints.length === 0) {
      const allEp = extractEndpointsFromSnippet(src);
      if (allEp.length > 0) {
        // find the last endpoint occurrence before the test index
        let last = null;
        for (const ep of allEp) {
          const idx = src.indexOf(ep.split(' ')[1]);
          if (idx !== -1 && idx < start) last = ep;
        }
        if (last) endpoints.push(last);
      }
    }

    const desc = t.desc.replace(/\r?\n/g, ' ').trim();

    // categories detection from emojis and text
    const cats = new Set();
    for (const e of Object.keys(emojiMap)) {
      if (desc.includes(e)) cats.add(emojiMap[e]);
    }
    // textual heuristics
    if (/\b401\b/.test(desc) || /no auth|missing auth|invalid token|expired token/i.test(desc)) cats.add('auth');
    if (/\b403\b|forbidden|not allowed|only admin|only admin/i.test(desc)) cats.add('authorization');
    if (/\b404\b|not found/i.test(desc)) cats.add('not-found');
    if (/sql injection|sqli|xss|cross[- ]?site/i.test(desc)) cats.add('security');
    if (/rate limit|429|rate limiting/i.test(desc)) cats.add('rate-limit');
    if (/validation|missing|invalid|400\b|bad request/i.test(desc)) cats.add('validation');
    if (cats.size === 0) cats.add('other');

    // count categories
    for (const c of cats) categoryCounts[c] = (categoryCounts[c] || 0) + 1;

    // count endpoints
    if (endpoints.length === 0) endpoints = ['(no endpoint found)'];
    for (const e of endpoints) endpointCounts[e] = (endpointCounts[e] || 0) + 1;

    csvRows.push({ file: rel, description: desc, endpoints: endpoints.join(' ; '), categories: Array.from(cats).join(' ; ') });
  }
}

// Prepare CSV
const reportDir = path.join(root, 'reports');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
const csvPath = path.join(reportDir, 'e2e-report.csv');
let csv = csvEscape('specFile') + ',' + csvEscape('testDescription') + ',' + csvEscape('endpoints') + ',' + csvEscape('categories') + '\n';
for (const r of csvRows) {
  csv += csvEscape(r.file) + ',' + csvEscape(r.description) + ',' + csvEscape(r.endpoints) + ',' + csvEscape(r.categories) + '\n';
}
fs.writeFileSync(csvPath, csv, 'utf8');

// Prepare Markdown summary
const mdPath = path.join(reportDir, 'e2e-report.md');
let md = `# E2E Test Coverage Report\n\n`;
md += `Generated: ${new Date().toISOString()}\n\n`;
md += `- Repository path: \\${process.cwd()}\n`;
md += `- Specs scanned: ${e2eFiles.length}\n`;
md += `- Total test cases (it()): ${totalTests}\n\n`;
md += `**Per-file summary**\n\n`;
md += `| Spec file | # tests |\n|---|---:|\n`;
for (const p of perFile) {
  md += `| ${p.file} | ${p.tests} |\n`;
}
md += `\n`;

md += `**Category counts (approx)**\n\n`;
md += `| Category | Count |\n|---|---:|\n`;
const sortedCats = Object.keys(categoryCounts).sort((a,b)=>categoryCounts[b]-categoryCounts[a]);
for (const c of sortedCats) md += `| ${c} | ${categoryCounts[c]} |\n`;
md += `\n`;

md += `**Top endpoints (most referenced)**\n\n`;
md += `| Endpoint | Occurrences |\n|---|---:|\n`;
const sortedEps = Object.keys(endpointCounts).sort((a,b)=>endpointCounts[b]-endpointCounts[a]).slice(0,50);
for (const e of sortedEps) md += `| ${e} | ${endpointCounts[e]} |\n`;
md += `\n`;

md += `**Notes & Limitations**\n\n`;
md += `- This is a best-effort mapping: endpoints are extracted from HTTP call expressions (e.g. .get('/api/v1/...')).\n`;
md += `- Tests that call helper functions (helpers defined elsewhere) may not have explicit endpoint strings in the ` + "it()" + ` block; those tests may show \\(no endpoint found\\) in the CSV.\n`;
md += `- Categories are heuristically inferred from emojis and description text; they may be incomplete.\n`;
md += `\n`;
md += `**Files created**\n\n`;
md += `- reports/e2e-report.md\n`;
md += `- reports/e2e-report.csv\n`;

fs.writeFileSync(mdPath, md, 'utf8');

console.log('Wrote:', csvPath);
console.log('Wrote:', mdPath);
console.log('Total specs:', e2eFiles.length, 'Total tests:', totalTests);

process.exit(0);
