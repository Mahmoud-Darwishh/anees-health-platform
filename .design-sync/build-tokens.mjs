// Builds .design-sync/tokens-pkg/styles.css for the design-sync converter.
//
//   1. Fonts: downloads Plus Jakarta Sans (latin, variable 300..700) and
//      IBM Plex Sans Arabic (arabic+latin, 300/400/500/600/700) from Google
//      Fonts into tokens-pkg/fonts/ and writes fonts.css with local url()s.
//      Skipped when fonts/fonts.css already exists (delete the dir to refetch).
//   2. Styles: compiles tokens-pkg/styles.scss with the repo's own `sass`,
//      then prepends the site's self-hosted Bootstrap (the public site's real
//      base layer, loaded from <head> in src/app/layout.tsx).
//
// Run from anywhere: node .design-sync/build-tokens.mjs
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as sass from 'sass';

const here = dirname(fileURLToPath(import.meta.url)); // .design-sync/
const repoRoot = dirname(here);
const pkgDir = join(here, 'tokens-pkg');
const fontsDir = join(pkgDir, 'fonts');

const GOOGLE_CSS_URL =
  'https://fonts.googleapis.com/css2' +
  '?family=Plus+Jakarta+Sans:wght@300..700' +
  '&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700' +
  '&display=swap';
// A modern-browser UA makes Google serve woff2 with unicode-range subsets.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
// Subsets worth shipping for a bilingual EN/AR brand. Everything else
// (cyrillic, vietnamese, ...) is dropped to keep the bundle lean.
const KEEP_SUBSETS = new Set(['latin', 'latin-ext', 'arabic']);

async function buildFonts() {
  const fontsCss = join(fontsDir, 'fonts.css');
  if (existsSync(fontsCss)) {
    console.error(`fonts: ${fontsCss} exists — skipping fetch`);
    return;
  }
  console.error('fonts: fetching Google Fonts CSS…');
  const res = await fetch(GOOGLE_CSS_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Google Fonts CSS fetch failed: ${res.status}`);
  const css = await res.text();

  // Blocks look like: /* latin */\n@font-face { ... url(https://...woff2) ... }
  const blocks = [...css.matchAll(/\/\*\s*([a-z-]+)\s*\*\/\s*(@font-face\s*\{[^}]+\})/g)];
  if (!blocks.length) throw new Error('no @font-face blocks parsed from Google Fonts CSS');
  mkdirSync(fontsDir, { recursive: true });

  const out = [];
  let n = 0;
  for (const [, subset, block] of blocks) {
    if (!KEEP_SUBSETS.has(subset)) continue;
    const fam = block.match(/font-family:\s*'([^']+)'/)?.[1] ?? 'font';
    const weight = block.match(/font-weight:\s*([\d\s.]+);/)?.[1]?.trim().replace(/\s+/g, '-') ?? '400';
    const url = block.match(/url\((https:[^)]+\.woff2)\)/)?.[1];
    if (!url) continue;
    const file = `${fam.toLowerCase().replace(/\s+/g, '-')}-${weight}-${subset}.woff2`;
    const bin = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!bin.ok) throw new Error(`font download failed (${bin.status}): ${url}`);
    writeFileSync(join(fontsDir, file), Buffer.from(await bin.arrayBuffer()));
    out.push(`/* ${subset} */\n${block.replace(url, `./${file}`)}`);
    n++;
  }
  if (!n) throw new Error('no font files downloaded — check KEEP_SUBSETS vs the fetched CSS');
  writeFileSync(fontsCss, out.join('\n') + '\n');
  console.error(`fonts: ${n} woff2 files + fonts.css written`);
}

function buildStyles() {
  console.error('styles: compiling styles.scss…');
  const compiled = sass.compile(join(pkgDir, 'styles.scss'), {
    style: 'expanded',
    importers: [
      {
        // The repo's SCSS uses the Next.js "@/" alias (→ src/); plain sass
        // doesn't know it, so resolve it here the same way next.config does.
        findFileUrl(url) {
          if (!url.startsWith('@/')) return null;
          return pathToFileURL(join(repoRoot, 'src', url.slice(2)));
        },
      },
    ],
  });
  const bootstrap = readFileSync(join(repoRoot, 'public', 'assets', 'css', 'bootstrap.min.css'), 'utf8');
  const banner =
    '/* Anees Health design system — Bootstrap 5.3 (self-hosted, the site\'s real base layer)\n' +
    '   followed by the Anees brand tokens + base styles compiled from src/assets/scss. */\n';
  writeFileSync(join(pkgDir, 'styles.css'), banner + bootstrap + '\n' + compiled.css + '\n');
  console.error(`styles: styles.css written (${((bootstrap.length + compiled.css.length) / 1024).toFixed(0)} KB)`);
}

await buildFonts();
buildStyles();
console.error('build-tokens: done');
