import 'server-only';

import { getMedplumClient } from './client';
import { EgyptianExtensions } from './fhir-extensions';
import {
  isDayCode,
  type AvailabilitySlot,
  type PractitionerAvailability,
} from './availability-types';

/**
 * Clinician availability, stored on a FHIR `PractitionerRole` (one per
 * practitioner). Weekly recurring windows live in `availableTime`; the covered
 * service areas + a free-text note live in Anees extensions. This keeps
 * availability in the clinical/practitioner source of truth (Medplum) — no
 * Postgres schema change — and lets the dispatch board answer "who's free, in
 * which area, today?".
 *
 * Client-safe constants, types and pure helpers live in `availability-types.ts`;
 * they are re-exported here so server callers keep a single import site.
 */

export {
  DAY_CODES,
  DAY_LABELS,
  dayCodeForDate,
  slotForDay,
  type DayCode,
  type AvailabilitySlot,
  type PractitionerAvailability,
} from './availability-types';

type MedplumPractitionerRole = {
  resourceType: 'PractitionerRole';
  id?: string;
  meta?: { versionId?: string };
  active?: boolean;
  practitioner?: { reference?: string; display?: string };
  availableTime?: Array<{ daysOfWeek?: string[]; availableStartTime?: string; availableEndTime?: string }>;
  extension?: Array<{ url: string; valueString?: string }>;
};

/** "09:00:00" or "09:00" → "09:00"; anything invalid → "". */
function toHm(value: string | undefined): string {
  if (!value) return '';
  const match = value.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
}

function parseAreas(role: MedplumPractitionerRole): string[] {
  const raw = role.extension?.find((e) => e.url === EgyptianExtensions.clinicianServiceAreas)?.valueString ?? '';
  return raw
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
}

function parseAvailability(role: MedplumPractitionerRole): PractitionerAvailability {
  const slots: AvailabilitySlot[] = (role.availableTime ?? [])
    .map((entry) => ({
      daysOfWeek: (entry.daysOfWeek ?? []).filter(isDayCode),
      startTime: toHm(entry.availableStartTime),
      endTime: toHm(entry.availableEndTime),
    }))
    .filter((slot) => slot.daysOfWeek.length > 0 && slot.startTime && slot.endTime);

  return {
    practitionerRoleId: role.id ?? null,
    practitionerReference: role.practitioner?.reference ?? '',
    slots,
    areas: parseAreas(role),
    note: role.extension?.find((e) => e.url === EgyptianExtensions.clinicianAvailabilityNote)?.valueString ?? null,
  };
}

function emptyAvailability(practitionerReference: string): PractitionerAvailability {
  return { practitionerRoleId: null, practitionerReference, slots: [], areas: [], note: null };
}

async function findRoleForPractitioner(practitionerReference: string): Promise<MedplumPractitionerRole | null> {
  const medplum = await getMedplumClient();
  const roles = (await medplum.searchResources('PractitionerRole', {
    practitioner: practitionerReference,
    _count: '1',
  })) as MedplumPractitionerRole[];
  return roles[0] ?? null;
}

/** Read one clinician's availability. Returns an empty shape if none is set. */
export async function getPractitionerAvailability(practitionerReference: string): Promise<PractitionerAvailability> {
  const role = await findRoleForPractitioner(practitionerReference);
  return role ? parseAvailability(role) : emptyAvailability(practitionerReference);
}

/** Upsert one clinician's availability (create the PractitionerRole if absent). */
export async function setPractitionerAvailability(
  practitionerReference: string,
  input: { slots: AvailabilitySlot[]; areas: string[]; note: string | null },
  practitionerDisplay?: string | null,
): Promise<PractitionerAvailability> {
  const medplum = await getMedplumClient();
  const existing = await findRoleForPractitioner(practitionerReference);

  const availableTime = input.slots
    .filter((slot) => slot.daysOfWeek.length > 0 && slot.startTime && slot.endTime)
    .map((slot) => ({
      daysOfWeek: slot.daysOfWeek,
      availableStartTime: `${slot.startTime}:00`,
      availableEndTime: `${slot.endTime}:00`,
    }));

  const extension = [
    { url: EgyptianExtensions.clinicianServiceAreas, valueString: input.areas.join(', ') },
    ...(input.note ? [{ url: EgyptianExtensions.clinicianAvailabilityNote, valueString: input.note }] : []),
  ];

  const resource: MedplumPractitionerRole = {
    ...(existing ?? {}),
    resourceType: 'PractitionerRole',
    active: true,
    practitioner: { reference: practitionerReference, display: practitionerDisplay ?? existing?.practitioner?.display },
    availableTime,
    extension,
  };

  const saved = existing?.id
    ? ((await medplum.updateResource(resource as never)) as MedplumPractitionerRole)
    : ((await medplum.createResource(resource as never)) as MedplumPractitionerRole);

  return parseAvailability(saved);
}

/**
 * All clinician availability, keyed by practitioner reference — one search for the
 * whole dispatch board (cheap at launch scale).
 */
export async function listPractitionerAvailability(): Promise<Map<string, PractitionerAvailability>> {
  const medplum = await getMedplumClient();
  const roles = (await medplum.searchResources('PractitionerRole', { _count: '500' })) as MedplumPractitionerRole[];
  const byReference = new Map<string, PractitionerAvailability>();
  for (const role of roles) {
    const parsed = parseAvailability(role);
    if (parsed.practitionerReference) {
      byReference.set(parsed.practitionerReference, parsed);
    }
  }
  return byReference;
}
