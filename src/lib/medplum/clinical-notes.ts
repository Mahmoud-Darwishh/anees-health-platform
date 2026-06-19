import 'server-only';

import { EgyptianExtensions } from '@/lib/medplum/fhir-extensions';
import { getMedplumClient } from '@/lib/medplum/client';
import { recordProvenance } from '@/lib/medplum/provenance';
import {
  MEDPLUM_CODE_SYSTEMS,
  isRestrictedTierClinicalCoding,
  isRestrictedTierSecurityCoding,
} from '@/lib/medplum/constants';

type FhirReference = {
  reference?: string;
  display?: string;
};

export type ClinicalNoteDiscipline = 'medical' | 'nursing' | 'physiotherapy';

type MedplumClinicalNoteResource = {
  resourceType: 'Composition';
  id?: string;
  meta?: {
    versionId?: string;
    security?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  };
  status: 'preliminary' | 'final' | 'amended' | 'entered-in-error';
  type: {
    coding: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
  };
  subject: FhirReference;
  encounter?: FhirReference;
  date: string;
  author: FhirReference[];
  title: string;
  attester?: Array<{ mode: string; time?: string; party?: FhirReference }>;
  relatesTo?: Array<{ code: string; targetReference?: FhirReference }>;
  section: Array<{
    title?: string;
    text?: {
      status?: 'generated';
      div?: string;
    };
  }>;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
  }>;
};

export type CreateClinicalNoteDraftInput = {
  patientId: string;
  encounterId?: string | null;
  title?: string | null;
  noteBody: string;
  discipline: ClinicalNoteDiscipline;
  amendedFromCompositionId?: string | null;
  authorReference?: string | null;
  authorDisplay?: string | null;
  recordedAt?: Date;
};

export type ClinicalNoteItem = {
  id: string;
  versionId?: string | null;
  status: 'preliminary' | 'final' | 'amended' | 'entered-in-error';
  title: string;
  body: string;
  date: string;
  author?: string | null;
  encounterId?: string | null;
  discipline: ClinicalNoteDiscipline;
  restrictedTier: boolean;
};

function normalizeDiscipline(raw?: string | null): ClinicalNoteDiscipline {
  if (raw === 'nursing' || raw === 'physiotherapy') {
    return raw;
  }
  return 'medical';
}

function extractDiscipline(resource: MedplumClinicalNoteResource): ClinicalNoteDiscipline {
  const byExtension = resource.extension?.find(
    (entry) => entry.url === EgyptianExtensions.clinicalNoteDiscipline,
  )?.valueCode;

  return normalizeDiscipline(byExtension);
}

function hasRestrictedTier(resource: MedplumClinicalNoteResource): boolean {
  const typeCoding = resource.type?.coding ?? [];
  const security = resource.meta?.security ?? [];

  return [
    ...security.map((coding) => isRestrictedTierSecurityCoding(coding)),
    ...typeCoding.map((coding) => isRestrictedTierClinicalCoding(coding)),
  ].some(Boolean);
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toNarrativeDiv(noteBody: string): string {
  const lines = noteBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const html = lines.length > 0 ? lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('') : '<p></p>';
  return `<div xmlns=\"http://www.w3.org/1999/xhtml\">${html}</div>`;
}

function extractNoteBody(resource: MedplumClinicalNoteResource): string {
  const extValue = resource.extension?.find((entry) => entry.url === EgyptianExtensions.clinicalNoteText)?.valueString;
  if (extValue) return extValue;

  const div = resource.section?.[0]?.text?.div;
  if (!div) return '';

  return div
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function createClinicalNoteDraft(
  input: CreateClinicalNoteDraftInput,
): Promise<MedplumClinicalNoteResource> {
  const medplum = await getMedplumClient();

  const resource: MedplumClinicalNoteResource = {
    resourceType: 'Composition',
    status: 'preliminary',
    type: {
      coding: [
        {
          system: MEDPLUM_CODE_SYSTEMS.clinicalNoteType,
          code: 'clinical-note',
          display: 'Clinical Note',
        },
      ],
    },
    subject: { reference: `Patient/${input.patientId}` },
    encounter: input.encounterId ? { reference: `Encounter/${input.encounterId}` } : undefined,
    date: (input.recordedAt ?? new Date()).toISOString(),
    author: [
      {
        reference: input.authorReference ?? undefined,
        display: input.authorDisplay ?? undefined,
      },
    ],
    title: input.title?.trim() || 'Clinical Note',
    // An amendment supersedes its predecessor (immutable history — the prior note
    // is never mutated; a new Composition `replaces` it).
    relatesTo: input.amendedFromCompositionId
      ? [{ code: 'replaces', targetReference: { reference: `Composition/${input.amendedFromCompositionId}` } }]
      : undefined,
    section: [
      {
        title: 'Assessment',
        text: {
          status: 'generated',
          div: toNarrativeDiv(input.noteBody),
        },
      },
    ],
    extension: [
      {
        url: EgyptianExtensions.clinicalNoteText,
        valueString: input.noteBody,
      },
      {
        url: EgyptianExtensions.clinicalNoteDiscipline,
        valueCode: input.discipline,
      },
      ...(input.amendedFromCompositionId
        ? [
            {
              url: EgyptianExtensions.clinicalNoteAmends,
              valueString: input.amendedFromCompositionId,
            },
          ]
        : []),
    ],
  };

  return (await medplum.createResource(resource as never)) as MedplumClinicalNoteResource;
}

export async function signClinicalNote(
  compositionId: string,
  signedBy?: { authorReference?: string | null; authorDisplay?: string | null },
  options?: { expectedVersionId?: string | null },
): Promise<MedplumClinicalNoteResource> {
  const medplum = await getMedplumClient();

  const existing = (await medplum.readResource('Composition', compositionId)) as MedplumClinicalNoteResource;

  if (options?.expectedVersionId && existing.meta?.versionId !== options.expectedVersionId) {
    throw new Error('Clinical note was updated by another user. Please refresh and try again.');
  }

  if (existing.status === 'final') {
    return existing;
  }

  const signedAt = new Date().toISOString();

  const partyRef = signedBy?.authorReference ?? existing.author?.[0]?.reference;
  const partyDisplay = signedBy?.authorDisplay ?? existing.author?.[0]?.display;
  const party: FhirReference = partyRef
    ? { reference: partyRef, display: partyDisplay ?? undefined }
    : { display: partyDisplay ?? 'Clinician' };

  const signed = (await medplum.updateResource({
    ...existing,
    status: 'final',
    date: signedAt,
    author: [party],
    // Legal attestation: who signed, in what capacity (legal), and when.
    attester: [{ mode: 'legal', time: signedAt, party }],
    extension: [
      ...(existing.extension ?? []),
      {
        url: EgyptianExtensions.clinicalNoteSignedAt,
        valueString: signedAt,
      },
    ],
  } as never, {
    headers: options?.expectedVersionId
      ? { 'If-Match': `W/\"${options.expectedVersionId}\"` }
      : undefined,
  })) as MedplumClinicalNoteResource;

  // Immutable signature provenance (best-effort — never undoes the sign).
  await recordProvenance({
    targetReference: `Composition/${signed.id ?? compositionId}`,
    recordedAt: new Date(signedAt),
    activity: 'UPDATE',
    agents: [
      { role: 'legal', who: party },
      { role: 'author', who: party },
    ],
  });

  return signed;
}

export async function listPatientClinicalNotes(
  patientId: string,
  count = 40,
  options?: { signedOnly?: boolean },
): Promise<ClinicalNoteItem[]> {
  const medplum = await getMedplumClient();
  const resources = (await medplum.searchResources('Composition', {
    subject: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-date',
  })) as MedplumClinicalNoteResource[];

  const notes = resources
    .filter((resource) => (options?.signedOnly ? resource.status === 'final' : true))
    .map((resource) => ({
      id: resource.id ?? '',
      versionId: resource.meta?.versionId ?? null,
      status: resource.status,
      title: resource.title ?? 'Clinical Note',
      body: extractNoteBody(resource),
      date: resource.date,
      author: resource.author?.[0]?.display ?? null,
      encounterId: resource.encounter?.reference?.replace('Encounter/', '') ?? null,
      discipline: extractDiscipline(resource),
      restrictedTier: hasRestrictedTier(resource),
    }))
    .filter((note) => note.id);

  return notes;
}
