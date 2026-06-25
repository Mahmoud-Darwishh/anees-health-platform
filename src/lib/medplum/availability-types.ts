/**
 * Client-safe availability constants, types and pure helpers. Kept out of the
 * `server-only` `availability.ts` so client components (the editor) and the
 * server (ops board) can share them without pulling Medplum I/O into the bundle.
 */

export const DAY_CODES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayCode = (typeof DAY_CODES)[number];

export const DAY_LABELS: Record<DayCode, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export type AvailabilitySlot = {
  daysOfWeek: DayCode[];
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
};

export type PractitionerAvailability = {
  practitionerRoleId: string | null;
  practitionerReference: string;
  slots: AvailabilitySlot[];
  areas: string[];
  note: string | null;
};

/** JS day (0=Sun..6=Sat) → FHIR day code. */
export function dayCodeForDate(date: Date): DayCode {
  const map: DayCode[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[date.getDay()];
}

export function isDayCode(value: string): value is DayCode {
  return (DAY_CODES as readonly string[]).includes(value);
}

/** The slot covering `dayCode`, if any — "Available 09:00–17:00 today". */
export function slotForDay(availability: PractitionerAvailability, dayCode: DayCode): AvailabilitySlot | null {
  return availability.slots.find((slot) => slot.daysOfWeek.includes(dayCode)) ?? null;
}
