/**
 * Seeds the full ICD-10-CM classification into the `icd10_codes` table.
 *
 * The dataset is pulled from a pinned public source at runtime and parsed in
 * memory — no CSV/JSON files are kept in the repo. Idempotent: re-running upserts
 * via chunked `createMany({ skipDuplicates })`.
 *
 * Run: `npm run db:seed:icd10`
 *
 * Source: k4m1113/ICD-10-CSV (public domain ICD-10-CM order file, dotless codes).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SOURCE_URL = 'https://raw.githubusercontent.com/k4m1113/ICD-10-CSV/master/codes.csv';
const CHUNK_SIZE = 5000;

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function toDotted(fullCode: string): string {
  return fullCode.length > 3 ? `${fullCode.slice(0, 3)}.${fullCode.slice(3)}` : fullCode;
}

async function main() {
  console.log('Downloading ICD-10-CM source...');
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to download ICD-10 source: HTTP ${response.status}`);
  }
  const raw = await response.text();

  const seen = new Set<string>();
  const rows: Array<{ code: string; display: string }> = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols = parseLine(line);
    const full = (cols[2] ?? '').trim();
    const display = (cols[4] ?? cols[3] ?? '').trim();
    if (!full || !display) continue;
    const code = toDotted(full);
    if (seen.has(code)) continue;
    seen.add(code);
    rows.push({ code, display });
  }

  console.log(`Parsed ${rows.length} unique ICD-10 codes. Seeding...`);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const result = await prisma.icd10Code.createMany({ data: chunk, skipDuplicates: true });
    inserted += result.count;
    console.log(`  ${Math.min(i + CHUNK_SIZE, rows.length)}/${rows.length} processed`);
  }

  const total = await prisma.icd10Code.count();
  console.log(`Done. Newly inserted: ${inserted}. Total in table: ${total}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
