import 'server-only';

import { getMedplumClient } from './client';

export type MedplumTerminologyDomain =
  | 'problem'
  | 'allergen'
  | 'allergy-reaction'
  | 'allergy-note'
  | 'medication'
  | 'lab-order'
  | 'diagnostic-report';

export type MedplumTerminologyCoding = {
  system?: string;
  code?: string;
  display?: string;
};

export type MedplumTerminologyTerm = {
  label: string;
  codings: MedplumTerminologyCoding[];
  source?: 'valueset-expand' | 'conceptmap-translate' | 'clinical-data';
};

export class MedplumTerminologyNotFoundError extends Error {
  constructor(domain: MedplumTerminologyDomain) {
    super(`Please choose a valid ${domain} term from Medplum suggestions.`);
    this.name = 'MedplumTerminologyNotFoundError';
  }
}

type FhirParametersPart = {
  name: string;
  valueString?: string;
  valueUri?: string;
  valueCode?: string;
  valueBoolean?: boolean;
  part?: FhirParametersPart[];
};

type FhirParameters = {
  resourceType: 'Parameters';
  parameter?: Array<{
    name: string;
    valueBoolean?: boolean;
    valueString?: string;
    valueUri?: string;
    valueCode?: string;
    valueInteger?: number;
    part?: FhirParametersPart[];
  }>;
};

type ExpandedValueSet = {
  expansion?: {
    contains?: Array<{
      system?: string;
      code?: string;
      display?: string;
      contains?: Array<{
        system?: string;
        code?: string;
        display?: string;
      }>;
    }>;
  };
};

type TerminologyOperationConfig = {
  valueSetUrl?: string;
  defaultSystem?: string;
  allowTranslateToIcd10?: boolean;
};

const DOMAIN_CONFIG: Record<MedplumTerminologyDomain, TerminologyOperationConfig> = {
  // NOTE: `problem` is intentionally NOT served by Medplum's terminology server.
  // Its ICD-10 CodeSystem ships empty and is write-protected for our client, so
  // problems are resolved from the app-owned catalog in
  // `@/features/ehr/catalogs/icd10-problems`. Kept here only for type completeness.
  problem: {},
  allergen: {
    valueSetUrl: 'http://snomed.info/sct?fhir_vs=ecl/<105590001',
    defaultSystem: 'http://snomed.info/sct',
  },
  'allergy-reaction': {
    valueSetUrl: 'http://snomed.info/sct?fhir_vs=ecl/<404684003',
    defaultSystem: 'http://snomed.info/sct',
  },
  'allergy-note': {},
  medication: {
    valueSetUrl: 'http://www.nlm.nih.gov/research/umls/rxnorm?fhir_vs',
    defaultSystem: 'http://www.nlm.nih.gov/research/umls/rxnorm',
  },
  'lab-order': {
    valueSetUrl: 'http://loinc.org/vs',
    defaultSystem: 'http://loinc.org',
  },
  'diagnostic-report': {
    valueSetUrl: 'http://loinc.org/vs',
    defaultSystem: 'http://loinc.org',
  },
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function getBooleanParam(parameters: FhirParameters | undefined, name: string): boolean | null {
  const node = parameters?.parameter?.find((item) => item.name === name);
  if (!node) return null;
  return node.valueBoolean ?? null;
}

function flattenContains(nodes: NonNullable<ExpandedValueSet['expansion']>['contains']): MedplumTerminologyCoding[] {
  if (!nodes || nodes.length === 0) {
    return [];
  }

  const out: MedplumTerminologyCoding[] = [];

  for (const node of nodes) {
    if (node.system || node.code || node.display) {
      out.push({
        system: node.system,
        code: node.code,
        display: node.display,
      });
    }

    if (node.contains?.length) {
      out.push(...flattenContains(node.contains));
    }
  }

  return out;
}

function toLabelFromCoding(coding: MedplumTerminologyCoding): string | null {
  return coding.display?.trim() || coding.code?.trim() || null;
}

async function expandValueSetByDomain(
  domain: MedplumTerminologyDomain,
  query: string,
  limit: number,
): Promise<MedplumTerminologyTerm[]> {
  const config = DOMAIN_CONFIG[domain];
  if (!config.valueSetUrl) {
    return [];
  }

  const medplum = await getMedplumClient();
  const body: FhirParameters = {
    resourceType: 'Parameters',
    parameter: [
      { name: 'url', valueUri: config.valueSetUrl },
      { name: 'count', valueInteger: limit },
      { name: 'includeDesignations', valueBoolean: false },
      { name: 'includeDefinition', valueBoolean: false },
    ],
  };

  const trimmedQuery = query.trim();
  if (trimmedQuery) {
    body.parameter?.push({ name: 'filter', valueString: trimmedQuery });
  }

  try {
    const expanded = (await medplum.post('ValueSet/$expand', body)) as ExpandedValueSet;
    const codings = flattenContains(expanded.expansion?.contains);
    const terms = codings
      .map((coding) => {
        const label = toLabelFromCoding(coding);
        if (!label) {
          return null;
        }
        return {
          label,
          codings: [coding],
          source: 'valueset-expand' as const,
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item);

    return dedupeTerms(terms, limit);
  } catch {
    return [];
  }
}

async function validateCodeWithValueSet(
  domain: MedplumTerminologyDomain,
  coding: MedplumTerminologyCoding,
): Promise<boolean> {
  const config = DOMAIN_CONFIG[domain];
  if (!coding.code) {
    return false;
  }

  const medplum = await getMedplumClient();
  const parameters: FhirParameters = {
    resourceType: 'Parameters',
    parameter: [
      { name: 'code', valueCode: coding.code },
      { name: 'display', valueString: coding.display },
      { name: 'system', valueUri: coding.system ?? config.defaultSystem },
    ],
  };

  if (config.valueSetUrl) {
    parameters.parameter?.push({ name: 'url', valueUri: config.valueSetUrl });
  }

  try {
    const response = (await medplum.post('ValueSet/$validate-code', parameters)) as FhirParameters;
    return getBooleanParam(response, 'result') === true;
  } catch {
    return false;
  }
}

function dedupeTerms(terms: MedplumTerminologyTerm[], limit: number): MedplumTerminologyTerm[] {
  const seen = new Set<string>();
  const out: MedplumTerminologyTerm[] = [];

  for (const term of terms) {
    const key = normalize(term.label);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(term);
    if (out.length >= limit) {
      break;
    }
  }

  return out;
}

function toTerm(label: string | undefined, codings: MedplumTerminologyCoding[] | undefined): MedplumTerminologyTerm | null {
  if (!label?.trim()) {
    return null;
  }

  return {
    label: label.trim(),
    codings: codings ?? [],
  };
}

export async function suggestMedplumTerminology(
  domain: MedplumTerminologyDomain,
  query: string,
  limit = 12,
): Promise<MedplumTerminologyTerm[]> {
  const expandedTerms = await expandValueSetByDomain(domain, query, limit);
  if (expandedTerms.length > 0) {
    return expandedTerms;
  }

  const q = normalize(query);
  if (!q) {
    return [];
  }

  const medplum = await getMedplumClient();
  const terms: MedplumTerminologyTerm[] = [];

  if (domain === 'problem') {
    const rows = (await medplum.searchResources('Condition', {
      _count: '250',
      _sort: '-_lastUpdated',
    })) as Array<{ code?: { text?: string; coding?: MedplumTerminologyCoding[] } }>;

    for (const row of rows) {
      const label = row.code?.text ?? row.code?.coding?.[0]?.display ?? row.code?.coding?.[0]?.code;
      if (!label || !normalize(label).includes(q)) {
        continue;
      }
      const term = toTerm(label, row.code?.coding);
      if (term) terms.push({ ...term, source: 'clinical-data' });
    }

    return dedupeTerms(terms, limit);
  }

  if (domain === 'allergen' || domain === 'allergy-reaction' || domain === 'allergy-note') {
    const rows = (await medplum.searchResources('AllergyIntolerance', {
      _count: '250',
      _sort: '-_lastUpdated',
    })) as Array<{
      code?: { text?: string; coding?: MedplumTerminologyCoding[] };
      reaction?: Array<{ manifestation?: Array<{ text?: string; coding?: MedplumTerminologyCoding[] }> }>;
      note?: Array<{ text?: string }>;
    }>;

    for (const row of rows) {
      if (domain === 'allergen') {
        const label = row.code?.text ?? row.code?.coding?.[0]?.display ?? row.code?.coding?.[0]?.code;
        if (!label || !normalize(label).includes(q)) continue;
        const term = toTerm(label, row.code?.coding);
        if (term) terms.push({ ...term, source: 'clinical-data' });
      }

      if (domain === 'allergy-reaction') {
        const label = row.reaction?.[0]?.manifestation?.[0]?.text
          ?? row.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display
          ?? row.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.code;
        if (!label || !normalize(label).includes(q)) continue;
        const codings = row.reaction?.[0]?.manifestation?.[0]?.coding ?? [];
        const term = toTerm(label, codings);
        if (term) terms.push({ ...term, source: 'clinical-data' });
      }

      if (domain === 'allergy-note') {
        const label = row.note?.[0]?.text;
        if (!label || !normalize(label).includes(q)) continue;
        const term = toTerm(label, []);
        if (term) terms.push({ ...term, source: 'clinical-data' });
      }
    }

    return dedupeTerms(terms, limit);
  }

  if (domain === 'medication') {
    const rows = (await medplum.searchResources('MedicationStatement', {
      _count: '250',
      _sort: '-_lastUpdated',
    })) as Array<{ medicationCodeableConcept?: { text?: string; coding?: MedplumTerminologyCoding[] } }>;

    for (const row of rows) {
      const label = row.medicationCodeableConcept?.text
        ?? row.medicationCodeableConcept?.coding?.[0]?.display
        ?? row.medicationCodeableConcept?.coding?.[0]?.code;
      if (!label || !normalize(label).includes(q)) continue;
      const term = toTerm(label, row.medicationCodeableConcept?.coding);
      if (term) terms.push({ ...term, source: 'clinical-data' });
    }

    return dedupeTerms(terms, limit);
  }

  if (domain === 'lab-order') {
    const rows = (await medplum.searchResources('ServiceRequest', {
      _count: '250',
      _sort: '-_lastUpdated',
    })) as Array<{ code?: { text?: string; coding?: MedplumTerminologyCoding[] } }>;

    for (const row of rows) {
      const label = row.code?.text ?? row.code?.coding?.[0]?.display ?? row.code?.coding?.[0]?.code;
      if (!label || !normalize(label).includes(q)) continue;
      const term = toTerm(label, row.code?.coding);
      if (term) terms.push({ ...term, source: 'clinical-data' });
    }

    return dedupeTerms(terms, limit);
  }

  const rows = (await medplum.searchResources('DiagnosticReport', {
    _count: '250',
    _sort: '-_lastUpdated',
  })) as Array<{ code?: { text?: string; coding?: MedplumTerminologyCoding[] } }>;

  for (const row of rows) {
    const label = row.code?.text ?? row.code?.coding?.[0]?.display ?? row.code?.coding?.[0]?.code;
    if (!label || !normalize(label).includes(q)) continue;
    const term = toTerm(label, row.code?.coding);
    if (term) terms.push({ ...term, source: 'clinical-data' });
  }

  return dedupeTerms(terms, limit);
}

export async function assertMedplumTerminologyValue(
  domain: MedplumTerminologyDomain,
  value: string,
): Promise<MedplumTerminologyTerm> {
  const suggestions = await suggestMedplumTerminology(domain, value, 25);
  const exact = suggestions.find((item) => normalize(item.label) === normalize(value));
  if (!exact) {
    throw new MedplumTerminologyNotFoundError(domain);
  }

  const codingToValidate = exact.codings[0];
  if (codingToValidate?.code) {
    const valid = await validateCodeWithValueSet(domain, codingToValidate);
    if (!valid && exact.source === 'valueset-expand') {
      throw new Error(`Selected ${domain} term could not be validated in Medplum terminology.`);
    }
  }

  return exact;
}

export function extractPreferredCode(
  term: MedplumTerminologyTerm,
  preferredSystemKeywords: string[],
): string | null {
  for (const keyword of preferredSystemKeywords) {
    const match = term.codings.find((coding) => (coding.system ?? '').toLowerCase().includes(keyword.toLowerCase()));
    if (match?.code) {
      return match.code;
    }
  }

  return term.codings[0]?.code ?? null;
}
