/**
 * Medication formulary — app-owned, coded drug catalog (server-only).
 *
 * Mirrors the ICD-10 catalog pattern (`./icd10-problems`): the app owns a curated
 * value set so saved medications carry a real RxNorm (+ ATC) coding even though
 * Medplum's self-hosted terminology server does not have RxNorm loaded. Beyond
 * identity, each entry carries the **active ingredients, therapeutic/structural
 * classes, and controlled-substance schedule** that the safety engine
 * (`@/lib/ehr/medication-safety`) needs for drug–drug / drug–allergy checks.
 *
 * This is a curated home-care formulary, not the whole of RxNorm — the point is a
 * safe, growing core. Add entries here (or swap the backing store for a seeded
 * `drug_codes` table / terminology server) behind the same exported functions.
 *
 * Class keys are shared with the allergen catalog + safety engine — keep aligned.
 */
import 'server-only';

import type { ScreenDrug } from '@/lib/ehr/medication-safety';

export const RXNORM_SYSTEM = 'http://www.nlm.nih.gov/research/umls/rxnorm';
export const ATC_SYSTEM = 'http://www.whocc.no/atc';

export type ControlledSchedule = 'CII' | 'CIII' | 'CIV' | 'CV';

type DrugEntry = {
  rxnorm: string;
  atc?: string;
  label: string;
  aliases?: string[];
  ingredients: string[];
  classes: string[];
  schedule?: ControlledSchedule;
};

export type DrugTerm = {
  label: string;
  code: string; // RxNorm
  codings: Array<{ system: string; code: string; display: string }>;
};

export type ResolvedDrug = {
  canonicalLabel: string;
  rxnorm: string;
  atc: string | null;
  ingredients: string[];
  classes: string[];
  schedule: ControlledSchedule | null;
  codings: Array<{ system: string; code: string; display: string }>;
};

// ── The formulary ────────────────────────────────────────────────────────────
// rxnorm = RxNorm ingredient RxCUI. classes/ingredients drive safety screening.
const FORMULARY: DrugEntry[] = [
  // Anticoagulants
  { rxnorm: '11289', atc: 'B01AA03', label: 'Warfarin', aliases: ['coumadin', 'marevan'], ingredients: ['warfarin'], classes: ['anticoagulant'] },
  { rxnorm: '1037045', atc: 'B01AF01', label: 'Rivaroxaban', aliases: ['xarelto'], ingredients: ['rivaroxaban'], classes: ['anticoagulant'] },
  { rxnorm: '1364430', atc: 'B01AF02', label: 'Apixaban', aliases: ['eliquis'], ingredients: ['apixaban'], classes: ['anticoagulant'] },
  { rxnorm: '67108', atc: 'B01AB05', label: 'Enoxaparin', aliases: ['clexane', 'lovenox'], ingredients: ['enoxaparin'], classes: ['anticoagulant'] },
  // Antiplatelets
  { rxnorm: '1191', atc: 'B01AC06', label: 'Aspirin', aliases: ['asa', 'aspocid', 'jusprin', 'acetylsalicylic acid'], ingredients: ['aspirin'], classes: ['antiplatelet', 'salicylate'] },
  { rxnorm: '32968', atc: 'B01AC04', label: 'Clopidogrel', aliases: ['plavix'], ingredients: ['clopidogrel'], classes: ['antiplatelet'] },
  // NSAIDs
  { rxnorm: '5640', atc: 'M01AE01', label: 'Ibuprofen', aliases: ['brufen', 'advil'], ingredients: ['ibuprofen'], classes: ['nsaid'] },
  { rxnorm: '7258', atc: 'M01AE02', label: 'Naproxen', ingredients: ['naproxen'], classes: ['nsaid'] },
  { rxnorm: '3355', atc: 'M01AB05', label: 'Diclofenac', aliases: ['voltaren', 'cataflam'], ingredients: ['diclofenac'], classes: ['nsaid'] },
  { rxnorm: '140587', atc: 'M01AH01', label: 'Celecoxib', aliases: ['celebrex'], ingredients: ['celecoxib'], classes: ['nsaid', 'cox2_inhibitor'] },
  // ACE inhibitors / ARBs
  { rxnorm: '29046', atc: 'C09AA03', label: 'Lisinopril', ingredients: ['lisinopril'], classes: ['ace_inhibitor'] },
  { rxnorm: '3827', atc: 'C09AA02', label: 'Enalapril', aliases: ['ezapril'], ingredients: ['enalapril'], classes: ['ace_inhibitor'] },
  { rxnorm: '35296', atc: 'C09AA05', label: 'Ramipril', aliases: ['tritace'], ingredients: ['ramipril'], classes: ['ace_inhibitor'] },
  { rxnorm: '52175', atc: 'C09CA01', label: 'Losartan', aliases: ['cozaar'], ingredients: ['losartan'], classes: ['arb'] },
  { rxnorm: '69749', atc: 'C09CA03', label: 'Valsartan', aliases: ['tareg', 'diovan'], ingredients: ['valsartan'], classes: ['arb'] },
  // Diuretics
  { rxnorm: '4603', atc: 'C03CA01', label: 'Furosemide', aliases: ['lasix', 'frusemide'], ingredients: ['furosemide'], classes: ['loop_diuretic'] },
  { rxnorm: '5487', atc: 'C03AA03', label: 'Hydrochlorothiazide', aliases: ['hctz'], ingredients: ['hydrochlorothiazide'], classes: ['thiazide_diuretic'] },
  { rxnorm: '9997', atc: 'C03DA01', label: 'Spironolactone', aliases: ['aldactone'], ingredients: ['spironolactone'], classes: ['potassium_sparing_diuretic'] },
  // Beta-blockers / CCB
  { rxnorm: '19484', atc: 'C07AB07', label: 'Bisoprolol', aliases: ['concor'], ingredients: ['bisoprolol'], classes: ['beta_blocker'] },
  { rxnorm: '6918', atc: 'C07AB02', label: 'Metoprolol', ingredients: ['metoprolol'], classes: ['beta_blocker'] },
  { rxnorm: '1202', atc: 'C07AB03', label: 'Atenolol', aliases: ['tenormin'], ingredients: ['atenolol'], classes: ['beta_blocker'] },
  { rxnorm: '17767', atc: 'C08CA01', label: 'Amlodipine', aliases: ['norvasc', 'amlor'], ingredients: ['amlodipine'], classes: ['calcium_channel_blocker'] },
  // Statins
  { rxnorm: '83367', atc: 'C10AA05', label: 'Atorvastatin', aliases: ['lipitor', 'ator'], ingredients: ['atorvastatin'], classes: ['statin'] },
  { rxnorm: '36567', atc: 'C10AA01', label: 'Simvastatin', aliases: ['zocor'], ingredients: ['simvastatin'], classes: ['statin'] },
  { rxnorm: '301542', atc: 'C10AA07', label: 'Rosuvastatin', aliases: ['crestor'], ingredients: ['rosuvastatin'], classes: ['statin'] },
  // Macrolides
  { rxnorm: '18631', atc: 'J01FA10', label: 'Azithromycin', aliases: ['zithromax', 'zithrokan'], ingredients: ['azithromycin'], classes: ['macrolide', 'qt_prolonging'] },
  { rxnorm: '21212', atc: 'J01FA09', label: 'Clarithromycin', aliases: ['klacid'], ingredients: ['clarithromycin'], classes: ['macrolide', 'qt_prolonging'] },
  { rxnorm: '4053', atc: 'J01FA01', label: 'Erythromycin', ingredients: ['erythromycin'], classes: ['macrolide', 'qt_prolonging'] },
  // Beta-lactams
  { rxnorm: '723', atc: 'J01CA04', label: 'Amoxicillin', aliases: ['amoxil', 'e-mox', 'hibiotic'], ingredients: ['amoxicillin'], classes: ['penicillin', 'beta_lactam'] },
  { rxnorm: '733', atc: 'J01CA01', label: 'Ampicillin', ingredients: ['ampicillin'], classes: ['penicillin', 'beta_lactam'] },
  { rxnorm: '2194', atc: 'J01DC02', label: 'Cefuroxime', aliases: ['zinnat'], ingredients: ['cefuroxime'], classes: ['cephalosporin', 'beta_lactam'] },
  { rxnorm: '2193', atc: 'J01DD04', label: 'Ceftriaxone', aliases: ['rocephin', 'cefotrix'], ingredients: ['ceftriaxone'], classes: ['cephalosporin', 'beta_lactam'] },
  // Other antibiotics
  { rxnorm: '2551', atc: 'J01MA02', label: 'Ciprofloxacin', aliases: ['ciprobay', 'cipro'], ingredients: ['ciprofloxacin'], classes: ['fluoroquinolone', 'qt_prolonging'] },
  { rxnorm: '82122', atc: 'J01MA12', label: 'Levofloxacin', aliases: ['tavanic'], ingredients: ['levofloxacin'], classes: ['fluoroquinolone', 'qt_prolonging'] },
  { rxnorm: '10180', atc: 'J01EE01', label: 'Co-trimoxazole (sulfamethoxazole/trimethoprim)', aliases: ['septrin', 'bactrim', 'sulfamethoxazole', 'trimethoprim'], ingredients: ['sulfamethoxazole', 'trimethoprim'], classes: ['sulfonamide_antibiotic'] },
  // SSRIs / SNRIs
  { rxnorm: '36437', atc: 'N06AB06', label: 'Sertraline', aliases: ['lustral', 'zoloft'], ingredients: ['sertraline'], classes: ['ssri', 'serotonergic'] },
  { rxnorm: '4493', atc: 'N06AB03', label: 'Fluoxetine', aliases: ['prozac'], ingredients: ['fluoxetine'], classes: ['ssri', 'serotonergic'] },
  { rxnorm: '2556', atc: 'N06AB04', label: 'Citalopram', aliases: ['cipram'], ingredients: ['citalopram'], classes: ['ssri', 'serotonergic', 'qt_prolonging'] },
  { rxnorm: '39786', atc: 'N06AX16', label: 'Venlafaxine', aliases: ['effexor', 'efexor'], ingredients: ['venlafaxine'], classes: ['snri', 'serotonergic'] },
  // Opioids
  { rxnorm: '10689', atc: 'N02AX02', label: 'Tramadol', aliases: ['tramal', 'contramal'], ingredients: ['tramadol'], classes: ['opioid', 'serotonergic'], schedule: 'CIV' },
  { rxnorm: '7052', atc: 'N02AA01', label: 'Morphine', ingredients: ['morphine'], classes: ['opioid'], schedule: 'CII' },
  { rxnorm: '2670', atc: 'R05DA04', label: 'Codeine', ingredients: ['codeine'], classes: ['opioid'], schedule: 'CIII' },
  { rxnorm: '7804', atc: 'N02AA05', label: 'Oxycodone', aliases: ['oxycontin'], ingredients: ['oxycodone'], classes: ['opioid'], schedule: 'CII' },
  // Benzodiazepines
  { rxnorm: '3322', atc: 'N05BA01', label: 'Diazepam', aliases: ['valium'], ingredients: ['diazepam'], classes: ['benzodiazepine'], schedule: 'CIV' },
  { rxnorm: '6470', atc: 'N05BA06', label: 'Lorazepam', aliases: ['ativan'], ingredients: ['lorazepam'], classes: ['benzodiazepine'], schedule: 'CIV' },
  { rxnorm: '596', atc: 'N05BA12', label: 'Alprazolam', aliases: ['xanax'], ingredients: ['alprazolam'], classes: ['benzodiazepine'], schedule: 'CIV' },
  // GI / endocrine / cardiac / misc
  { rxnorm: '7646', atc: 'A02BC01', label: 'Omeprazole', aliases: ['losec', 'gastrazole'], ingredients: ['omeprazole'], classes: ['ppi'] },
  { rxnorm: '40790', atc: 'A02BC02', label: 'Pantoprazole', aliases: ['controloc'], ingredients: ['pantoprazole'], classes: ['ppi'] },
  { rxnorm: '6809', atc: 'A10BA02', label: 'Metformin', aliases: ['glucophage', 'cidophage'], ingredients: ['metformin'], classes: ['biguanide'] },
  { rxnorm: '25789', atc: 'A10BB09', label: 'Gliclazide', aliases: ['diamicron'], ingredients: ['gliclazide'], classes: ['sulfonylurea'] },
  { rxnorm: '5856', atc: 'A10AB01', label: 'Insulin (regular)', aliases: ['actrapid', 'humulin r'], ingredients: ['insulin'], classes: ['insulin'] },
  { rxnorm: '3407', atc: 'C01AA05', label: 'Digoxin', aliases: ['lanoxin'], ingredients: ['digoxin'], classes: ['digoxin', 'cardiac_glycoside'] },
  { rxnorm: '8591', atc: 'A12BA01', label: 'Potassium chloride', aliases: ['kcl', 'slow-k'], ingredients: ['potassium chloride'], classes: ['potassium_supplement'] },
  { rxnorm: '4450', atc: 'J02AC01', label: 'Fluconazole', aliases: ['diflucan'], ingredients: ['fluconazole'], classes: ['azole_antifungal', 'qt_prolonging'] },
  { rxnorm: '10582', atc: 'H03AA01', label: 'Levothyroxine', aliases: ['eltroxin', 'euthyrox'], ingredients: ['levothyroxine'], classes: ['thyroid_hormone'] },
  { rxnorm: '161', atc: 'N02BE01', label: 'Paracetamol', aliases: ['acetaminophen', 'panadol', 'cetal', 'tylenol'], ingredients: ['paracetamol'], classes: ['analgesic'] },
  { rxnorm: '435', atc: 'R03AC02', label: 'Salbutamol', aliases: ['albuterol', 'ventolin', 'farcolin'], ingredients: ['salbutamol'], classes: ['beta_agonist'] },
];

const COMMON_STARTERS = ['Warfarin', 'Aspirin', 'Amoxicillin', 'Paracetamol', 'Metformin', 'Omeprazole', 'Atorvastatin', 'Furosemide', 'Lisinopril', 'Tramadol'];

function norm(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

const BY_RXNORM = new Map<string, DrugEntry>();
const BY_LABEL = new Map<string, DrugEntry>();
const BY_ALIAS = new Map<string, DrugEntry>();
for (const entry of FORMULARY) {
  BY_RXNORM.set(entry.rxnorm, entry);
  BY_LABEL.set(norm(entry.label), entry);
  for (const alias of entry.aliases ?? []) {
    BY_ALIAS.set(norm(alias), entry);
  }
}

function codingsFor(entry: DrugEntry): ResolvedDrug['codings'] {
  const codings = [{ system: RXNORM_SYSTEM, code: entry.rxnorm, display: entry.label }];
  if (entry.atc) {
    codings.push({ system: ATC_SYSTEM, code: entry.atc, display: entry.label });
  }
  return codings;
}

function toTerm(entry: DrugEntry): DrugTerm {
  return { label: entry.label, code: entry.rxnorm, codings: codingsFor(entry) };
}

function toResolved(entry: DrugEntry): ResolvedDrug {
  return {
    canonicalLabel: entry.label,
    rxnorm: entry.rxnorm,
    atc: entry.atc ?? null,
    ingredients: entry.ingredients,
    classes: entry.classes,
    schedule: entry.schedule ?? null,
    codings: codingsFor(entry),
  };
}

/** Ranked typeahead over the formulary. Empty query → common home-care starters. */
export async function searchDrugFormulary(query: string, limit = 12): Promise<DrugTerm[]> {
  const q = norm(query);
  if (!q) {
    return COMMON_STARTERS.map((label) => BY_LABEL.get(norm(label)))
      .filter((entry): entry is DrugEntry => !!entry)
      .slice(0, limit)
      .map(toTerm);
  }

  const scored = FORMULARY.map((entry) => {
    const label = norm(entry.label);
    const aliasHit = (entry.aliases ?? []).some((alias) => norm(alias).includes(q));
    const ingredientHit = entry.ingredients.some((ing) => norm(ing).includes(q));
    let rank = 99;
    if (label === q || (entry.aliases ?? []).some((alias) => norm(alias) === q)) rank = 0;
    else if (label.startsWith(q)) rank = 1;
    else if (aliasHit) rank = 2;
    else if (label.includes(q)) rank = 3;
    else if (ingredientHit) rank = 4;
    return { entry, rank };
  }).filter((item) => item.rank < 99);

  scored.sort((a, b) => a.rank - b.rank || a.entry.label.localeCompare(b.entry.label));
  return scored.slice(0, limit).map((item) => toTerm(item.entry));
}

/** Resolve a picked drug to its coded record. Returns null when not in formulary. */
export async function resolveDrugTerminology(input: {
  label: string;
  explicitRxnorm?: string | null;
}): Promise<ResolvedDrug | null> {
  const rxnorm = input.explicitRxnorm?.trim();
  if (rxnorm && BY_RXNORM.has(rxnorm)) {
    return toResolved(BY_RXNORM.get(rxnorm)!);
  }

  const key = norm(input.label ?? '');
  const entry = BY_LABEL.get(key) ?? BY_ALIAS.get(key);
  return entry ? toResolved(entry) : null;
}

/**
 * Reduce a stored medication (label + optional RxNorm code) to the facts the
 * safety engine needs. Returns null when the drug is not in the formulary (the
 * caller should treat it as "unscreenable" and surface that).
 */
export async function toScreenDrug(label: string, rxnorm?: string | null): Promise<ScreenDrug | null> {
  const resolved = await resolveDrugTerminology({ label, explicitRxnorm: rxnorm ?? null });
  if (!resolved) {
    return null;
  }
  return {
    label: resolved.canonicalLabel,
    rxnorm: resolved.rxnorm,
    ingredients: resolved.ingredients,
    classes: resolved.classes,
  };
}
