/**
 * Allergen catalog — app-owned (server-only).
 *
 * Gives allergies a FHIR `category` and a coded `code` (SNOMED where known, plus
 * an Anees allergen code that links back to this catalog), and — critically —
 * the drug **classes** each allergen makes unsafe, so the safety engine can run
 * drug–allergy cross-checks (e.g. a penicillin allergy flags any beta-lactam).
 *
 * Free-text allergens not in this catalog are still allowed (allergens are
 * open-ended), but they carry no cross-reactivity data and therefore cannot be
 * screened — the caller should record the clinician-chosen category and surface
 * that the entry is unscreenable.
 *
 * Class keys are shared with the drug formulary + safety engine — keep aligned.
 */
import 'server-only';

import type { ScreenAllergy } from '@/lib/ehr/medication-safety';

export const SNOMED_SYSTEM = 'http://snomed.info/sct';
export const ANEES_ALLERGEN_SYSTEM = 'https://anees.health/fhir/CodeSystem/allergen';

export type AllergyCategory = 'medication' | 'food' | 'environment' | 'biologic';

type AllergenEntry = {
  label: string;
  aliases?: string[];
  snomed?: string;
  category: AllergyCategory;
  reactiveClasses: Array<{ class: string; severity: 'contraindicated' | 'warning' }>;
};

export type AllergenTerm = {
  label: string;
  code: string; // Anees allergen slug (always present)
  codings: Array<{ system: string; code: string; display: string }>;
};

export type ResolvedAllergen = {
  canonicalLabel: string;
  category: AllergyCategory;
  codings: Array<{ system: string; code: string; display: string }>;
  reactiveClasses: Array<{ class: string; severity: 'contraindicated' | 'warning' }>;
};

const CATALOG: AllergenEntry[] = [
  // Drug allergens (carry cross-reactivity)
  { label: 'Penicillin', aliases: ['penicillins', 'penicillin v', 'benzylpenicillin', 'amoxicillin allergy'], snomed: '6369005', category: 'medication', reactiveClasses: [{ class: 'penicillin', severity: 'contraindicated' }, { class: 'beta_lactam', severity: 'warning' }] },
  { label: 'Cephalosporin', aliases: ['cephalosporins', 'cefuroxime', 'ceftriaxone'], category: 'medication', reactiveClasses: [{ class: 'cephalosporin', severity: 'contraindicated' }, { class: 'beta_lactam', severity: 'warning' }] },
  { label: 'Sulfonamide (sulfa)', aliases: ['sulfa', 'sulfonamides', 'co-trimoxazole', 'septrin', 'sulfamethoxazole'], category: 'medication', reactiveClasses: [{ class: 'sulfonamide_antibiotic', severity: 'contraindicated' }] },
  { label: 'Aspirin', aliases: ['asa', 'acetylsalicylic acid'], category: 'medication', reactiveClasses: [{ class: 'salicylate', severity: 'contraindicated' }, { class: 'nsaid', severity: 'warning' }] },
  { label: 'NSAID', aliases: ['nsaids', 'ibuprofen', 'diclofenac', 'naproxen'], category: 'medication', reactiveClasses: [{ class: 'nsaid', severity: 'contraindicated' }] },
  { label: 'Macrolide', aliases: ['erythromycin', 'azithromycin', 'clarithromycin'], category: 'medication', reactiveClasses: [{ class: 'macrolide', severity: 'contraindicated' }] },
  { label: 'Fluoroquinolone', aliases: ['ciprofloxacin', 'levofloxacin', 'quinolone'], category: 'medication', reactiveClasses: [{ class: 'fluoroquinolone', severity: 'contraindicated' }] },
  { label: 'Opioid (codeine/morphine)', aliases: ['codeine', 'morphine', 'opiate'], category: 'medication', reactiveClasses: [{ class: 'opioid', severity: 'warning' }] },
  { label: 'Statin', aliases: ['atorvastatin', 'simvastatin'], category: 'medication', reactiveClasses: [{ class: 'statin', severity: 'warning' }] },
  { label: 'Fluconazole (azole)', aliases: ['azole', 'antifungal'], category: 'medication', reactiveClasses: [{ class: 'azole_antifungal', severity: 'contraindicated' }] },
  // Food allergens
  { label: 'Peanut', aliases: ['peanuts'], snomed: '256349002', category: 'food', reactiveClasses: [] },
  { label: 'Tree nut', aliases: ['nuts', 'almond', 'walnut'], category: 'food', reactiveClasses: [] },
  { label: 'Egg', category: 'food', reactiveClasses: [] },
  { label: 'Cow milk', aliases: ['milk', 'dairy', 'lactose'], category: 'food', reactiveClasses: [] },
  { label: 'Shellfish', aliases: ['shrimp', 'prawn', 'crab', 'seafood'], category: 'food', reactiveClasses: [] },
  { label: 'Wheat (gluten)', aliases: ['gluten', 'wheat'], category: 'food', reactiveClasses: [] },
  { label: 'Soy', aliases: ['soya'], category: 'food', reactiveClasses: [] },
  { label: 'Sesame', category: 'food', reactiveClasses: [] },
  // Environment / biologic
  { label: 'Latex', snomed: '111088007', category: 'environment', reactiveClasses: [] },
  { label: 'Pollen', aliases: ['grass pollen', 'hay fever'], category: 'environment', reactiveClasses: [] },
  { label: 'House dust mite', aliases: ['dust', 'dust mite'], category: 'environment', reactiveClasses: [] },
  { label: 'Bee/wasp sting', aliases: ['bee', 'wasp', 'insect sting'], category: 'environment', reactiveClasses: [] },
  { label: 'Iodinated contrast', aliases: ['contrast', 'iodine'], category: 'medication', reactiveClasses: [{ class: 'iodinated_contrast', severity: 'warning' }] },
];

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function slug(label: string): string {
  return norm(label).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const BY_LABEL = new Map<string, AllergenEntry>();
const BY_ALIAS = new Map<string, AllergenEntry>();
for (const entry of CATALOG) {
  BY_LABEL.set(norm(entry.label), entry);
  for (const alias of entry.aliases ?? []) {
    BY_ALIAS.set(norm(alias), entry);
  }
}

function codingsFor(entry: AllergenEntry): ResolvedAllergen['codings'] {
  const codings: ResolvedAllergen['codings'] = [{ system: ANEES_ALLERGEN_SYSTEM, code: slug(entry.label), display: entry.label }];
  if (entry.snomed) {
    codings.unshift({ system: SNOMED_SYSTEM, code: entry.snomed, display: entry.label });
  }
  return codings;
}

const COMMON_STARTERS = ['Penicillin', 'Sulfonamide (sulfa)', 'Aspirin', 'NSAID', 'Peanut', 'Shellfish', 'Egg', 'Latex'];

export async function searchAllergens(query: string, limit = 12): Promise<AllergenTerm[]> {
  const q = norm(query);
  const pool = q
    ? CATALOG.filter(
        (entry) =>
          norm(entry.label).includes(q) || (entry.aliases ?? []).some((alias) => norm(alias).includes(q)),
      )
    : COMMON_STARTERS.map((label) => BY_LABEL.get(norm(label))).filter((entry): entry is AllergenEntry => !!entry);

  return pool.slice(0, limit).map((entry) => ({
    label: entry.label,
    code: slug(entry.label),
    codings: codingsFor(entry),
  }));
}

/** Resolve a picked allergen to its catalog record, or null when free-text. */
export async function resolveAllergenTerminology(input: {
  label: string;
  explicitCode?: string | null;
}): Promise<ResolvedAllergen | null> {
  const code = input.explicitCode?.trim();
  const entry =
    (code ? CATALOG.find((item) => slug(item.label) === code) : undefined) ??
    BY_LABEL.get(norm(input.label ?? '')) ??
    BY_ALIAS.get(norm(input.label ?? ''));

  if (!entry) {
    return null;
  }

  return {
    canonicalLabel: entry.label,
    category: entry.category,
    codings: codingsFor(entry),
    reactiveClasses: entry.reactiveClasses,
  };
}

/**
 * Reduce a recorded allergy (by allergen label) to what the safety engine needs.
 * Returns null when the allergen is free-text / not in the catalog (unscreenable).
 */
export async function toScreenAllergy(allergenLabel: string): Promise<ScreenAllergy | null> {
  const resolved = await resolveAllergenTerminology({ label: allergenLabel });
  if (!resolved || resolved.reactiveClasses.length === 0) {
    return null;
  }
  return { label: resolved.canonicalLabel, reactiveClasses: resolved.reactiveClasses };
}
