#!/usr/bin/env node
/*
 * Hard-coded colour ratchet guard.
 *
 * The design system has ONE source of truth for colour: the Sass anchors in
 * `src/assets/scss/utils/variables.scss` and the runtime tokens generated from
 * them in `src/assets/scss/base/tokens.scss`. Everywhere else should reference
 * those — `var(--color-*)`, `var(--text-*)`, `var(--status-*)`, or the Sass
 * `$brand-*` vars — never a raw `#rrggbb`. Raw hexes are how palettes drift
 * (five different "greens", a dozen near-identical greys).
 *
 * Like the logical-CSS guard, this does NOT force a big-bang rewrite: it
 * grandfathers existing hexes via a committed baseline
 * (`scripts/hardcoded-color-baseline.json`) and fails CI only when a file's raw
 * -hex count rises ABOVE its baseline. As files are migrated to tokens, run
 * `--update` to ratchet the baseline down — it can never climb back up.
 *
 * Usage:
 *   node scripts/guard-hardcoded-color.cjs            # check (CI) — exit 1 on regression
 *   node scripts/guard-hardcoded-color.cjs --list     # print every current raw hex
 *   node scripts/guard-hardcoded-color.cjs --update   # rewrite baseline to current
 *
 * Opt out a single legitimately-raw hex with a trailing `// hex-ok`.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const BASELINE_FILE = path.join('scripts', 'hardcoded-color-baseline.json');
const SCAN_ROOTS = ['src'];

// The two files that are ALLOWED to define raw hexes — they are the source of
// truth the rest of the system references.
const EXCLUDE = [
  /[\\/]utils[\\/]variables\.scss$/,
  /[\\/]base[\\/]tokens\.scss$/,
];

// Matches #rgb, #rrggbb, #rgba, #rrggbbaa as a colour literal.
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;

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

/** Returns array of { line, text } raw-hex hits for one file. */
function scanFile(absPath) {
  const lines = fs.readFileSync(absPath, 'utf8').split(/\r?\n/);
  const hits = [];
  lines.forEach((raw, i) => {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    if (/\bhex-ok\b/.test(raw)) return; // explicit, reviewed opt-out
    if (HEX_RE.test(raw)) hits.push({ line: i + 1, text: trimmed });
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
  console.log(`✔ hardcoded-color baseline updated — ${total} grandfathered raw hexes across ${Object.keys(currentCounts).length} files.`);
  process.exit(0);
}

if (mode === 'list') {
  for (const [file, hits] of Object.entries(current)) {
    console.log(`\n${file}  (${hits.length})`);
    for (const h of hits) console.log(`  ${h.line}: ${h.text}`);
  }
  console.log(`\nTotal: ${total} raw hexes in scope.`);
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
  console.error('\n\x1b[31m✖ hardcoded-color guard: new raw hex colours detected.\x1b[0m');
  console.error('  Reference the design tokens instead of a raw hex:');
  console.error('    var(--color-primary) / var(--color-secondary) / var(--text-*)');
  console.error('    var(--surface-*) / var(--border-*) / var(--status-*)');
  console.error('    or the Sass $brand-* anchors in utils/variables.scss\n');
  for (const r of regressions) {
    console.error(`  \x1b[1m${r.file}\x1b[0m — ${r.count} now, ${r.allowed} allowed:`);
    for (const h of current[r.file]) console.error(`     ${h.line}: ${h.text}`);
  }
  console.error('\n  If a hex is genuinely one-off (not a brand colour), append  // hex-ok');
  console.error('  After migrating a file to tokens, run:  npm run lint:color:update\n');
  process.exit(1);
}

console.log(`✔ hardcoded-color guard passed — ${total} grandfathered raw hexes, no new ones.`);
process.exit(0);
