/**
 * ICD-10 problem-list terminology — backed by the `icd10_codes` Postgres table
 * (server-only). The full ICD-10-CM classification (~71k codes) is seeded with
 * `npm run db:seed:icd10`.
 *
 * Why DB-backed: Medplum's built-in ICD-10 CodeSystem ships empty and is
 * write-protected for our client, so we own the value set. Saved Conditions are
 * still stamped with a standard ICD-10-CM coding — fully FHIR-valid; only the
 * lookup is app-owned. Coded-only: free text that maps to no code is rejected.
 */
import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

/**
 * ICD-10-CM system URI (the loaded classification). A recognised FHIR code system.
 * Switch to `http://hl7.org/fhir/sid/icd-10` (WHO) only if the seeded dataset is
 * swapped for the WHO 3–4 character release.
 */
export const ICD10_SYSTEM_URI = 'http://hl7.org/fhir/sid/icd-10-cm';

export type Icd10ProblemTerm = {
  label: string;
  code: string;
  codings: Array<{ system: string; code: string; display: string }>;
};

export type ResolvedProblemTerminology = {
  canonicalLabel: string;
  icd10: string;
  codings: Array<{ system: string; code: string; display: string }>;
};

/**
 * Lay-language / shorthand aliases so clinicians find a code by what they call it
 * (e.g. "htn" → I10, "peg" → Z93.1). Small in-code map, keyed by ICD-10 code.
 */
const ICD10_ALIASES: Record<string, string[]> = {
  'E11.9': ['diabetes', 'type 2 diabetes', 'dm', 'dm2', 't2dm'],
  'E10.9': ['type 1 diabetes', 'iddm', 't1dm'],
  'I10': ['htn', 'high blood pressure', 'hypertension'],
  'I50.9': ['heart failure', 'chf', 'congestive heart failure'],
  'I48.91': ['afib', 'atrial fibrillation', 'af'],
  'J44.9': ['copd', 'chronic obstructive pulmonary disease'],
  'J45.909': ['asthma'],
  'I63.9': ['stroke', 'cva', 'cerebral infarction', 'ischaemic stroke'],
  'I69.30': ['post stroke', 'stroke rehab', 'stroke sequelae'],
  'L89.90': ['pressure ulcer', 'bedsore', 'pressure injury', 'decubitus ulcer', 'pressure sore'],
  'R29.6': ['falls risk', 'fall risk', 'recurrent falls'],
  'R54': ['frailty', 'frail', 'senility'],
  'S72.009A': ['hip fracture', 'fractured hip', 'neck of femur fracture', 'nof'],
  'N18.9': ['ckd', 'chronic kidney disease', 'renal failure'],
  'N18.6': ['esrd', 'end stage renal disease'],
  'N39.0': ['uti', 'urine infection', 'urinary infection'],
  'G30.9': ['alzheimer', 'alzheimers'],
  'F03.90': ['dementia'],
  'M54.5': ['low back pain', 'lbp', 'back pain'],
  'Z51.5': ['palliative', 'palliative care', 'end of life', 'eol'],
  'Z93.1': ['peg', 'gastrostomy', 'feeding tube'],
  'Z93.0': ['tracheostomy', 'trach'],
  'Z99.11': ['ventilator', 'vent dependent', 'respirator dependent'],
  'Z74.09': ['reduced mobility', 'immobile', 'bed bound', 'bedbound'],
};

const ALIAS_TO_CODE = new Map<string, string>();
for (const [code, aliases] of Object.entries(ICD10_ALIASES)) {
  for (const alias of aliases) {
    ALIAS_TO_CODE.set(norm(alias), code);
  }
}

/** Common home-care starters shown before the clinician types anything. */
const COMMON_STARTER_CODES = [
  'E11.9', 'I10', 'I50.9', 'J44.9', 'I63.9', 'L89.90',
  'R29.6', 'M54.5', 'N18.9', 'N39.0', 'F03.90', 'Z74.09',
];

/** Codes boosted to the top of partial-text results (common + every alias target). */
const COMMON_CODES = new Set<string>([...COMMON_STARTER_CODES, ...Object.keys(ICD10_ALIASES)]);

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Escape LIKE/ILIKE wildcards so user input is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function toTerm(code: string, display: string): Icd10ProblemTerm {
  return {
    label: display,
    code,
    codings: [{ system: ICD10_SYSTEM_URI, code, display }],
  };
}

/**
 * Ranked typeahead over the full ICD-10-CM catalog. Empty query returns common
 * home-care starters. Ranking: lay-alias > code prefix > name starts-with >
 * name contains.
 */
export async function searchIcd10Problems(query: string, limit = 12): Promise<Icd10ProblemTerm[]> {
  const q = query.trim();
  if (!q) {
    const rows = await prisma.icd10Code.findMany({ where: { code: { in: COMMON_STARTER_CODES } } });
    const byCode = new Map(rows.map((row) => [row.code, row.display]));
    return COMMON_STARTER_CODES.flatMap((code) => {
      const display = byCode.get(code);
      return display ? [toTerm(code, display)] : [];
    }).slice(0, limit);
  }

  const esc = escapeLike(q);
  const like = `%${esc}%`;
  const startLike = `${esc}%`;
  const upper = q.toUpperCase();
  const codeStart = `${escapeLike(upper)}%`;
  const aliasCode = ALIAS_TO_CODE.get(norm(q)) ?? null;

  // Single ranked round-trip: alias hit > exact code > code prefix > name
  // starts-with > common diagnosis (substring) > any substring.
  const rows = await prisma.$queryRaw<Array<{ code: string; display: string }>>(Prisma.sql`
    SELECT code, display FROM icd10_codes
    WHERE upper(code) LIKE ${codeStart} OR display ILIKE ${like} OR code = ${aliasCode}
    ORDER BY
      (CASE
        WHEN code = ${aliasCode} THEN 0
        WHEN upper(code) = ${upper} THEN 1
        WHEN code IN (${Prisma.join([...COMMON_CODES])}) THEN 2
        WHEN upper(code) LIKE ${codeStart} THEN 3
        WHEN display ILIKE ${startLike} THEN 4
        ELSE 5
      END),
      length(code),
      display
    LIMIT ${limit}
  `);

  return rows.map((row) => toTerm(row.code, row.display));
}

/**
 * Coded-only resolver. Returns the canonical ICD-10 term for a picked problem, or
 * `null` when the input maps to no code (caller must then reject the save).
 * Resolves by explicit code first (the picker submits it), then exact name/alias.
 */
export async function resolveProblemTerminology(input: {
  label: string;
  explicitIcd10?: string | null;
}): Promise<ResolvedProblemTerminology | null> {
  let entry: { code: string; display: string } | null = null;

  const code = input.explicitIcd10?.trim();
  if (code) {
    entry = await prisma.icd10Code.findFirst({ where: { code: { equals: code, mode: 'insensitive' } } });
  }

  if (!entry && input.label?.trim()) {
    entry = await prisma.icd10Code.findFirst({
      where: { display: { equals: input.label.trim(), mode: 'insensitive' } },
    });
  }

  if (!entry) {
    const aliasCode = ALIAS_TO_CODE.get(norm(input.label));
    if (aliasCode) {
      entry = await prisma.icd10Code.findUnique({ where: { code: aliasCode } });
    }
  }

  if (!entry) {
    return null;
  }

  return {
    canonicalLabel: entry.display,
    icd10: entry.code,
    codings: [{ system: ICD10_SYSTEM_URI, code: entry.code, display: entry.display }],
  };
}
