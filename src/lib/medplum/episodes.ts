import 'server-only';

import { getMedplumClient } from '@/lib/medplum/client';

/**
 * FHIR `EpisodeOfCare` — the patient's care episode (admission → discharge).
 *
 * Phase 8 adds **discharge / episode-of-care closure**: closing an episode marks
 * the home-care episode `finished`, stamps the discharge time, and captures a
 * clinician outcome summary. This is the missing "end of care" bookend to the
 * visit/care-plan lifecycle. Gated by `episode.close` (matrix: care-plan sign →
 * licensed doctor / superadmin).
 */

const EPISODE_OUTCOME_EXT = 'https://anees.health/fhir/StructureDefinition/episode-outcome-summary';
const EPISODE_TYPE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/episodeofcare-type';

type FhirReference = { reference?: string; display?: string };

type EpisodeResource = {
  resourceType: 'EpisodeOfCare';
  id?: string;
  status: 'planned' | 'waitlist' | 'active' | 'onhold' | 'finished' | 'cancelled' | 'entered-in-error';
  type?: Array<{ coding?: Array<{ system?: string; code?: string; display?: string }> }>;
  patient?: FhirReference;
  period?: { start?: string; end?: string };
  careManager?: FhirReference;
  extension?: Array<{ url: string; valueString?: string }>;
};

export type EpisodeSummary = {
  id: string;
  status: string;
  start?: string;
  end?: string;
  outcomeSummary?: string;
  careManager?: string;
};

function homeCareType() {
  return [{ coding: [{ system: EPISODE_TYPE_SYSTEM, code: 'hacc', display: 'Home and Community Care' }] }];
}

function normalize(resource: EpisodeResource): EpisodeSummary | null {
  if (!resource.id) return null;
  return {
    id: resource.id,
    status: resource.status,
    start: resource.period?.start,
    end: resource.period?.end,
    outcomeSummary: resource.extension?.find((entry) => entry.url === EPISODE_OUTCOME_EXT)?.valueString,
    careManager: resource.careManager?.display ?? resource.careManager?.reference,
  };
}

export async function listPatientEpisodes(patientId: string, count = 10): Promise<EpisodeSummary[]> {
  const medplum = await getMedplumClient();
  const rows = (await medplum.searchResources('EpisodeOfCare', {
    patient: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-_lastUpdated',
  })) as EpisodeResource[];

  return rows.map(normalize).filter((episode): episode is EpisodeSummary => !!episode);
}

async function getActiveEpisode(patientId: string): Promise<EpisodeResource | null> {
  const medplum = await getMedplumClient();
  return (await medplum.searchOne('EpisodeOfCare', {
    patient: `Patient/${patientId}`,
    status: 'active',
    _sort: '-_lastUpdated',
  })) as EpisodeResource | null;
}

/**
 * Close the patient's care episode (discharge). Updates the active episode to
 * `finished` with an end date + outcome summary; if none exists, creates a
 * finished episode that records the discharge. Never mutates a clinical record
 * other than the episode.
 */
export async function closeCareEpisode(input: {
  patientId: string;
  outcomeSummary: string;
  performerReference?: string | null;
  performerDisplay?: string | null;
  endAt?: Date | null;
}): Promise<EpisodeResource> {
  const medplum = await getMedplumClient();
  const end = (input.endAt ?? new Date()).toISOString();
  const careManager = input.performerReference
    ? { reference: input.performerReference, display: input.performerDisplay ?? undefined }
    : undefined;
  const outcomeExtension = { url: EPISODE_OUTCOME_EXT, valueString: input.outcomeSummary };

  const existing = await getActiveEpisode(input.patientId);

  if (!existing) {
    return (await medplum.createResource({
      resourceType: 'EpisodeOfCare',
      status: 'finished',
      type: homeCareType(),
      patient: { reference: `Patient/${input.patientId}` },
      period: { start: end, end },
      careManager,
      extension: [outcomeExtension],
    } as never)) as EpisodeResource;
  }

  return (await medplum.updateResource({
    ...existing,
    status: 'finished',
    period: { ...(existing.period ?? {}), end },
    careManager: careManager ?? existing.careManager,
    extension: [...(existing.extension ?? []).filter((entry) => entry.url !== EPISODE_OUTCOME_EXT), outcomeExtension],
  } as never)) as EpisodeResource;
}
