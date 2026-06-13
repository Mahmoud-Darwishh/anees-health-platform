#!/usr/bin/env node
/*
 * Logical-CSS ratchet guard.
 *
 * RTL (Arabic) layout breaks when stylesheets use *physical* direction
 * properties (`margin-left`, `padding-right`, `text-align: left`, …) instead of
 * their *logical* equivalents (`margin-inline-start`, `padding-inline-end`,
 * `text-align: start`, …), which auto-flip with `dir`. The logical versions are
 * identical in LTR, so there is never a reason to write a new physical one.
 *
 * This guard enforces "logical properties only" going forward WITHOUT forcing a
 * big-bang rewrite: it grandfathers the existing debt via a committed baseline
 * (`scripts/logical-css-baseline.json`) and fails CI only when a file's physical
 * -property count rises ABOVE its baseline (i.e. new debt). As files are swept
 * to logical, run `--update` to ratchet the baseline down — it can never climb
 * back up.
 *
 * Usage:
 *   node scripts/guard-logical-css.cjs            # check (CI) — exit 1 on regression
 *   node scripts/guard-logical-css.cjs --list     # print every current violation
 *   node scripts/guard-logical-css.cjs --update   # rewrite the baseline to current
 *
 * Opt out a single legitimately-physical line with a trailing `// rtl-ok`.
 * Admin/clinician SCSS is English-only and out of scope.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const BASELINE_FILE = path.join('scripts', 'logical-css-baseline.json');

// Directories whose SCSS is bilingual (RTL-relevant) and therefore in scope.
const SCAN_ROOTS = ['src'];

// Out of scope: English-only surfaces + the token file (no rules) + this repo's
// generated/legacy globals are still scanned but grandfathered via baseline.
const EXCLUDE = [
  /[\\/]app[\\/]admin[\\/]/,
  /[\\/]app[\\/]clinician[\\/]/,
  /[\\/]variables\.scss$/,
];

// Physical direction properties that must become logical. Each regex matches the
// property at a declaration boundary so we don't trip on substrings.
const RULES = [
  { re: /(^|[\s;{])margin-(left|right)\s*:/, name: 'margin-left/right → margin-inline-start/end' },
  { re: /(^|[\s;{])padding-(left|right)\s*:/, name: 'padding-left/right → padding-inline-start/end' },
  {
    re: /(^|[\s;{])border-(left|right)(-(width|color|style))?\s*:/,
    name: 'border-left/right → border-inline-start/end',
  },
  { re: /text-align\s*:\s*(left|right)\b/, name: 'text-align: left/right → start/end' },
  { re: /float\s*:\s*(left|right)\b/, name: 'float: left/right → inline-start/end' },
];

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.scss')) {
      out.push(full);
    }
  }
  return out;
}

function inScope(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  return !EXCLUDE.some((re) => re.test(normalized));
}

/** Returns array of { line, text, rule } violations for one file. */
function scanFile(absPath) {
  const lines = fs.readFileSync(absPath, 'utf8').split(/\r?\n/);
  const hits = [];
  lines.forEach((raw, i) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    if (/\brtl-ok\b/.test(raw)) return; // explicit, reviewed opt-out
    for (const rule of RULES) {
      if (rule.re.test(raw)) {
        hits.push({ line: i + 1, text: trimmed, rule: rule.name });
        break;
      }
    }
  });
  return hits;
}

function collect() {
  const files = SCAN_ROOTS.flatMap((r) => (fs.existsSync(r) ? walk(r, []) : []));
  const result = {};
  for (const abs of files) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    if (!inScope(rel)) continue;
    const hits = scanFile(abs);
    if (hits.length) result[rel] = hits;
  }
  return result;
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeBaseline(counts) {
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
}

const mode = process.argv.includes('--update')
  ? 'update'
  : process.argv.includes('--list')
    ? 'list'
    : 'check';

const current = collect();
const currentCounts = Object.fromEntries(Object.entries(current).map(([f, h]) => [f, h.length]));
const total = Object.values(currentCounts).reduce((a, b) => a + b, 0);

if (mode === 'update') {
  writeBaseline(currentCounts);
  console.log(`✔ logical-css baseline updated — ${total} grandfathered physical properties across ${Object.keys(currentCounts).length} files.`);
  process.exit(0);
}

if (mode === 'list') {
  for (const [file, hits] of Object.entries(current)) {
    console.log(`\n${file}  (${hits.length})`);
    for (const h of hits) console.log(`  ${h.line}: ${h.text}`);
  }
  console.log(`\nTotal: ${total} physical properties in scope.`);
  process.exit(0);
}

// check mode — fail only on regression above baseline.
const baseline = readBaseline();
const regressions = [];
for (const [file, count] of Object.entries(currentCounts)) {
  const allowed = baseline[file] ?? 0;
  if (count > allowed) regressions.push({ file, count, allowed });
}

if (regressions.length) {
  console.error('\n\x1b[31m✖ logical-css guard: new physical direction properties detected.\x1b[0m');
  console.error('  Use logical properties so RTL (Arabic) flips automatically:');
  console.error('    margin-left → margin-inline-start    padding-right → padding-inline-end');
  console.error('    text-align: left → start             border-left → border-inline-start\n');
  for (const r of regressions) {
    console.error(`  \x1b[1m${r.file}\x1b[0m — ${r.count} now, ${r.allowed} allowed:`);
    for (const h of current[r.file]) console.error(`     ${h.line}: ${h.text}`);
  }
  console.error('\n  If a line is genuinely visual (not directional), append  // rtl-ok');
  console.error('  After sweeping a file to logical, run:  npm run lint:css:update\n');
  process.exit(1);
}

console.log(`✔ logical-css guard passed — ${total} grandfathered physical properties, no new ones.`);
process.exit(0);
