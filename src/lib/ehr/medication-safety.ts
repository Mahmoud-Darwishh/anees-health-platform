/**
 * Medication-safety screening engine — drug–allergy, drug–drug, and
 * duplicate-therapy checks.
 *
 * Deliberately a PURE module (no `server-only`, no I/O, no PHI): it takes already
 * coded/classified inputs and returns alerts, so it is trivially unit-testable and
 * could run client-side. The clinical KNOWLEDGE (which drug is in which class,
 * which class pairs interact) lives in `@/features/ehr/catalogs/drug-formulary`
 * and the rule table below. Swap the rule table for a licensed DDI source
 * (First Databank / Medi-Span) behind this same interface when one is procured.
 *
 * Class keys are free-form strings shared with the formulary + allergen catalogs
 * (e.g. `nsaid`, `anticoagulant`, `ace_inhibitor`, `beta_lactam`). Keep them in
 * sync across the three files.
 */

export type MedSafetySeverity = 'contraindicated' | 'warning' | 'info';

export type MedSafetyAlertKind = 'drug-allergy' | 'drug-drug' | 'duplicate-therapy';

export type MedSafetyAlert = {
  kind: MedSafetyAlertKind;
  severity: MedSafetySeverity;
  /** Short headline, e.g. "Allergy conflict: Penicillin". */
  title: string;
  /** One-line clinical rationale. */
  detail: string;
};

/** A medication reduced to the facts the engine needs. */
export type ScreenDrug = {
  label: string;
  rxnorm?: string | null;
  /** Normalised active-ingredient keys (for exact duplicate detection). */
  ingredients: string[];
  /** Therapeutic/structural class keys (for interactions + cross-reactivity). */
  classes: string[];
};

/** An allergy reduced to the drug classes it makes unsafe. */
export type ScreenAllergy = {
  label: string;
  reactiveClasses: Array<{ class: string; severity: 'contraindicated' | 'warning' }>;
};

export type ScreenMedicationInput = {
  candidate: ScreenDrug;
  currentMedications: ScreenDrug[];
  allergies: ScreenAllergy[];
};

type InteractionRule = {
  a: string;
  b: string;
  severity: MedSafetySeverity;
  detail: string;
};

/**
 * Curated class-pair interaction rules covering the highest-risk combinations in
 * home care. Each rule fires when the candidate carries class `a` and a current
 * medication carries class `b` (checked in both directions). Ordered roughly by
 * clinical severity; not exhaustive — extend as the formulary grows.
 */
const INTERACTION_RULES: InteractionRule[] = [
  { a: 'opioid', b: 'benzodiazepine', severity: 'contraindicated', detail: 'Opioid + benzodiazepine: additive respiratory depression and sedation; avoid co-prescription.' },
  { a: 'anticoagulant', b: 'nsaid', severity: 'contraindicated', detail: 'Anticoagulant + NSAID: markedly increased GI/bleeding risk.' },
  { a: 'anticoagulant', b: 'antiplatelet', severity: 'warning', detail: 'Anticoagulant + antiplatelet: increased bleeding risk; confirm the indication.' },
  { a: 'antiplatelet', b: 'nsaid', severity: 'warning', detail: 'Antiplatelet + NSAID: increased GI bleeding risk.' },
  { a: 'ace_inhibitor', b: 'potassium_sparing_diuretic', severity: 'warning', detail: 'ACE inhibitor + potassium-sparing diuretic: risk of hyperkalaemia; monitor K+.' },
  { a: 'arb', b: 'potassium_sparing_diuretic', severity: 'warning', detail: 'ARB + potassium-sparing diuretic: risk of hyperkalaemia; monitor K+.' },
  { a: 'ace_inhibitor', b: 'potassium_supplement', severity: 'warning', detail: 'ACE inhibitor + potassium supplement: risk of hyperkalaemia.' },
  { a: 'arb', b: 'potassium_supplement', severity: 'warning', detail: 'ARB + potassium supplement: risk of hyperkalaemia.' },
  { a: 'ace_inhibitor', b: 'arb', severity: 'warning', detail: 'Dual RAAS blockade (ACE inhibitor + ARB): hyperkalaemia and renal-impairment risk.' },
  { a: 'nsaid', b: 'ace_inhibitor', severity: 'warning', detail: 'NSAID + ACE inhibitor: reduced renal perfusion (worse with a diuretic — "triple whammy").' },
  { a: 'nsaid', b: 'arb', severity: 'warning', detail: 'NSAID + ARB: reduced renal perfusion and blunted antihypertensive effect.' },
  { a: 'statin', b: 'macrolide', severity: 'warning', detail: 'Statin + macrolide: raised statin levels; myopathy/rhabdomyolysis risk (esp. simvastatin).' },
  { a: 'statin', b: 'azole_antifungal', severity: 'warning', detail: 'Statin + azole antifungal: raised statin levels; myopathy risk.' },
  { a: 'ssri', b: 'nsaid', severity: 'warning', detail: 'SSRI + NSAID: increased GI bleeding risk.' },
  { a: 'ssri', b: 'anticoagulant', severity: 'warning', detail: 'SSRI + anticoagulant: increased bleeding risk.' },
  { a: 'serotonergic', b: 'serotonergic', severity: 'warning', detail: 'Two serotonergic agents: serotonin-syndrome risk.' },
  { a: 'qt_prolonging', b: 'qt_prolonging', severity: 'warning', detail: 'Two QT-prolonging agents: additive QT prolongation; consider ECG monitoring.' },
  { a: 'digoxin', b: 'loop_diuretic', severity: 'warning', detail: 'Digoxin + loop diuretic: diuretic-induced hypokalaemia potentiates digoxin toxicity.' },
  { a: 'digoxin', b: 'macrolide', severity: 'warning', detail: 'Digoxin + macrolide: raised digoxin levels; toxicity risk.' },
];

/** Therapeutic classes where a second agent of the same class is a duplicate. */
const DUPLICATE_CLASSES = new Set<string>([
  'nsaid',
  'anticoagulant',
  'antiplatelet',
  'ace_inhibitor',
  'arb',
  'beta_blocker',
  'ssri',
  'snri',
  'ppi',
  'statin',
  'opioid',
  'benzodiazepine',
  'biguanide',
  'sulfonylurea',
]);

const SEVERITY_RANK: Record<MedSafetySeverity, number> = { info: 0, warning: 1, contraindicated: 2 };

/** True when any alert is at or above `warning` (i.e. needs clinician acknowledgement). */
export function requiresAcknowledgement(alerts: MedSafetyAlert[]): boolean {
  return alerts.some((alert) => SEVERITY_RANK[alert.severity] >= SEVERITY_RANK.warning);
}

function intersects(a: string[], b: string[]): boolean {
  return a.some((item) => b.includes(item));
}

function screenDrugAllergy(candidate: ScreenDrug, allergies: ScreenAllergy[]): MedSafetyAlert[] {
  const alerts: MedSafetyAlert[] = [];
  for (const allergy of allergies) {
    for (const reactive of allergy.reactiveClasses) {
      if (candidate.classes.includes(reactive.class)) {
        alerts.push({
          kind: 'drug-allergy',
          severity: reactive.severity,
          title: `Allergy conflict: ${allergy.label}`,
          detail:
            reactive.severity === 'contraindicated'
              ? `${candidate.label} conflicts with the recorded ${allergy.label} allergy (same drug class). Do not administer without review.`
              : `${candidate.label} may cross-react with the recorded ${allergy.label} allergy (related class). Review before prescribing.`,
        });
        break; // one alert per allergy is enough
      }
    }
  }
  return alerts;
}

function screenDrugDrug(candidate: ScreenDrug, currentMedications: ScreenDrug[]): MedSafetyAlert[] {
  const alerts: MedSafetyAlert[] = [];
  for (const current of currentMedications) {
    for (const rule of INTERACTION_RULES) {
      const forward = candidate.classes.includes(rule.a) && current.classes.includes(rule.b);
      const backward = candidate.classes.includes(rule.b) && current.classes.includes(rule.a);
      if (forward || backward) {
        alerts.push({
          kind: 'drug-drug',
          severity: rule.severity,
          title: `Interaction: ${candidate.label} + ${current.label}`,
          detail: rule.detail,
        });
      }
    }
  }
  return alerts;
}

function screenDuplicate(candidate: ScreenDrug, currentMedications: ScreenDrug[]): MedSafetyAlert[] {
  const alerts: MedSafetyAlert[] = [];
  for (const current of currentMedications) {
    if (intersects(candidate.ingredients, current.ingredients)) {
      alerts.push({
        kind: 'duplicate-therapy',
        severity: 'warning',
        title: `Duplicate: ${candidate.label}`,
        detail: `Same active ingredient as the existing order "${current.label}". Confirm this is not an accidental duplicate.`,
      });
      continue;
    }
    const sharedClass = candidate.classes.find((cls) => DUPLICATE_CLASSES.has(cls) && current.classes.includes(cls));
    if (sharedClass) {
      alerts.push({
        kind: 'duplicate-therapy',
        severity: 'info',
        title: `Same class: ${candidate.label}`,
        detail: `Same therapeutic class (${sharedClass.replace(/_/g, ' ')}) as the existing order "${current.label}".`,
      });
    }
  }
  return alerts;
}

/**
 * Screen a candidate medication against the patient's allergies and current
 * medications. Returns all alerts (callers decide how to surface/gate them).
 */
export function screenMedication(input: ScreenMedicationInput): MedSafetyAlert[] {
  const { candidate, currentMedications, allergies } = input;
  return [
    ...screenDrugAllergy(candidate, allergies),
    ...screenDrugDrug(candidate, currentMedications),
    ...screenDuplicate(candidate, currentMedications),
  ];
}

/** Compact, human-readable summary for a flash message / acknowledgement prompt. */
export function summarizeAlerts(alerts: MedSafetyAlert[]): string {
  return alerts
    .map((alert) => {
      const tag =
        alert.severity === 'contraindicated' ? 'CONTRAINDICATED' : alert.severity === 'warning' ? 'WARNING' : 'INFO';
      return `[${tag}] ${alert.title} — ${alert.detail}`;
    })
    .join('  •  ');
}
