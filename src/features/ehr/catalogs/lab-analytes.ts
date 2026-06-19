/**
 * Lab analyte catalog — app-owned (PURE, no I/O, no PHI).
 *
 * Gives a discrete lab result a real **LOINC** code, a **UCUM** unit, and an
 * adult **reference range**, so a result entered in the chart becomes a coded,
 * range-checked `Observation` with an abnormal flag — not a free-text conclusion.
 * Mirrors the drug-formulary / assessment-instrument catalog pattern.
 *
 * Reference ranges are approximate sex-neutral adult ranges for flagging only —
 * not a substitute for the issuing lab's own reference interval. A free-text
 * fallback is allowed for analytes not in the catalog (saved uncoded, no flag).
 */

export const LOINC_SYSTEM = 'http://loinc.org';

export type LabAnalyte = {
  key: string;
  label: string;
  aliases?: string[];
  loinc: string;
  unit: string;
  low?: number;
  high?: number;
  category: 'chemistry' | 'haematology' | 'lipids' | 'endocrine' | 'other';
};

const ANALYTES: LabAnalyte[] = [
  // Haematology
  { key: 'hgb', label: 'Hemoglobin', aliases: ['hb', 'haemoglobin'], loinc: '718-7', unit: 'g/dL', low: 12, high: 17, category: 'haematology' },
  { key: 'hct', label: 'Hematocrit', aliases: ['haematocrit', 'pcv'], loinc: '4544-3', unit: '%', low: 36, high: 50, category: 'haematology' },
  { key: 'wbc', label: 'White blood cell count', aliases: ['wbc', 'leukocytes', 'tlc'], loinc: '6690-2', unit: '10*3/uL', low: 4, high: 11, category: 'haematology' },
  { key: 'plt', label: 'Platelet count', aliases: ['platelets'], loinc: '777-3', unit: '10*3/uL', low: 150, high: 400, category: 'haematology' },
  { key: 'inr', label: 'INR', aliases: ['prothrombin inr'], loinc: '6301-6', unit: '{INR}', low: 0.8, high: 1.2, category: 'haematology' },
  // Chemistry
  { key: 'glucose_fasting', label: 'Glucose (fasting)', aliases: ['fbs', 'fasting glucose'], loinc: '1558-6', unit: 'mg/dL', low: 70, high: 100, category: 'chemistry' },
  { key: 'creatinine', label: 'Creatinine', aliases: ['cr', 'serum creatinine'], loinc: '2160-0', unit: 'mg/dL', low: 0.6, high: 1.3, category: 'chemistry' },
  { key: 'urea', label: 'Urea nitrogen (BUN)', aliases: ['bun', 'urea'], loinc: '3094-0', unit: 'mg/dL', low: 7, high: 20, category: 'chemistry' },
  { key: 'sodium', label: 'Sodium', aliases: ['na'], loinc: '2951-2', unit: 'mmol/L', low: 135, high: 145, category: 'chemistry' },
  { key: 'potassium', label: 'Potassium', aliases: ['k'], loinc: '2823-3', unit: 'mmol/L', low: 3.5, high: 5.1, category: 'chemistry' },
  { key: 'chloride', label: 'Chloride', aliases: ['cl'], loinc: '2075-0', unit: 'mmol/L', low: 98, high: 107, category: 'chemistry' },
  { key: 'alt', label: 'ALT (SGPT)', aliases: ['sgpt', 'alanine aminotransferase'], loinc: '1742-6', unit: 'U/L', low: 7, high: 56, category: 'chemistry' },
  { key: 'ast', label: 'AST (SGOT)', aliases: ['sgot', 'aspartate aminotransferase'], loinc: '1920-8', unit: 'U/L', low: 10, high: 40, category: 'chemistry' },
  { key: 'bilirubin_total', label: 'Total bilirubin', aliases: ['bilirubin'], loinc: '1975-2', unit: 'mg/dL', low: 0.1, high: 1.2, category: 'chemistry' },
  { key: 'albumin', label: 'Albumin', loinc: '1751-7', unit: 'g/dL', low: 3.5, high: 5, category: 'chemistry' },
  { key: 'crp', label: 'C-reactive protein', aliases: ['crp'], loinc: '1988-5', unit: 'mg/L', low: 0, high: 5, category: 'chemistry' },
  { key: 'vitamin_d', label: '25-OH Vitamin D', aliases: ['vitamin d', 'vit d'], loinc: '1989-3', unit: 'ng/mL', low: 30, high: 100, category: 'chemistry' },
  // Endocrine
  { key: 'hba1c', label: 'HbA1c', aliases: ['a1c', 'glycated haemoglobin'], loinc: '4548-4', unit: '%', low: 4, high: 5.6, category: 'endocrine' },
  { key: 'tsh', label: 'TSH', aliases: ['thyroid stimulating hormone'], loinc: '3016-3', unit: 'mIU/L', low: 0.4, high: 4, category: 'endocrine' },
  // Lipids
  { key: 'cholesterol_total', label: 'Total cholesterol', aliases: ['cholesterol'], loinc: '2093-3', unit: 'mg/dL', high: 200, category: 'lipids' },
  { key: 'ldl', label: 'LDL cholesterol', aliases: ['ldl'], loinc: '2089-1', unit: 'mg/dL', high: 100, category: 'lipids' },
  { key: 'hdl', label: 'HDL cholesterol', aliases: ['hdl'], loinc: '2085-9', unit: 'mg/dL', low: 40, category: 'lipids' },
  { key: 'triglycerides', label: 'Triglycerides', aliases: ['tg'], loinc: '2571-8', unit: 'mg/dL', high: 150, category: 'lipids' },
];

export type LabAnalyteTerm = {
  label: string;
  code: string; // analyte key
  codings: Array<{ system: string; code: string; display: string }>;
};

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

const BY_KEY = new Map<string, LabAnalyte>();
const BY_LABEL = new Map<string, LabAnalyte>();
const BY_ALIAS = new Map<string, LabAnalyte>();
for (const analyte of ANALYTES) {
  BY_KEY.set(analyte.key, analyte);
  BY_LABEL.set(norm(analyte.label), analyte);
  for (const alias of analyte.aliases ?? []) BY_ALIAS.set(norm(alias), analyte);
}

const COMMON_STARTERS = ['hgb', 'wbc', 'plt', 'glucose_fasting', 'creatinine', 'potassium', 'sodium', 'alt', 'crp', 'hba1c'];

export function searchLabAnalytes(query: string, limit = 12): LabAnalyteTerm[] {
  const q = norm(query);
  const pool = q
    ? ANALYTES.filter(
        (a) => norm(a.label).includes(q) || (a.aliases ?? []).some((alias) => norm(alias).includes(q)),
      )
    : COMMON_STARTERS.map((key) => BY_KEY.get(key)).filter((a): a is LabAnalyte => !!a);

  return pool.slice(0, limit).map((a) => ({
    label: a.label,
    code: a.key,
    codings: [{ system: LOINC_SYSTEM, code: a.loinc, display: a.label }],
  }));
}

export function resolveLabAnalyte(input: { label: string; key?: string | null }): LabAnalyte | null {
  if (input.key && BY_KEY.has(input.key)) return BY_KEY.get(input.key)!;
  const k = norm(input.label ?? '');
  return BY_LABEL.get(k) ?? BY_ALIAS.get(k) ?? null;
}

/** Flag a value against the analyte's reference range (L / N / H). */
export function interpretLabValue(analyte: LabAnalyte, value: number): 'L' | 'N' | 'H' {
  if (typeof analyte.low === 'number' && value < analyte.low) return 'L';
  if (typeof analyte.high === 'number' && value > analyte.high) return 'H';
  return 'N';
}
