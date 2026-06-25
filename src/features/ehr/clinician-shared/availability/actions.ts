'use server';

import { revalidatePath } from 'next/cache';
import { setPractitionerAvailability, DAY_CODES, type DayCode } from '@/lib/medplum/availability';
import { resolveMyPractitionerReference } from './data';
import type { AvailabilityFormState } from './types';

function parseDays(formData: FormData): DayCode[] {
  const raw = formData.getAll('days').map((d) => String(d));
  return DAY_CODES.filter((code) => raw.includes(code));
}

function parseAreas(value: string): string[] {
  return value
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
}

/** Validate "HH:MM"; empty string otherwise. */
function normalizeTime(value: string): string {
  return /^\d{2}:\d{2}$/.test(value) ? value : '';
}

/**
 * Save the signed-in clinician's weekly availability. The simple editor manages a
 * single recurring window (a set of days + one time range) plus covered areas and
 * a note — enough for the next-24/48h dispatch board.
 */
export async function updateMyAvailabilityAction(
  _prev: AvailabilityFormState,
  formData: FormData,
): Promise<AvailabilityFormState> {
  try {
    const { reference, display } = await resolveMyPractitionerReference();

    const days = parseDays(formData);
    const startTime = normalizeTime(String(formData.get('startTime') ?? '').trim());
    const endTime = normalizeTime(String(formData.get('endTime') ?? '').trim());
    const areas = parseAreas(String(formData.get('areas') ?? ''));
    const note = String(formData.get('note') ?? '').trim() || null;

    if (days.length > 0) {
      if (!startTime || !endTime) {
        return { status: 'error', message: 'Choose a start and end time for your available days.' };
      }
      if (startTime >= endTime) {
        return { status: 'error', message: 'End time must be after start time.' };
      }
    }

    const slots = days.length > 0 ? [{ daysOfWeek: days, startTime, endTime }] : [];

    await setPractitionerAvailability(reference, { slots, areas, note }, display);

    revalidatePath('/clinician/profile');
    revalidatePath('/clinician/nursing/profile');
    revalidatePath('/clinician/doctor/profile');
    return { status: 'success', message: 'Availability saved. Dispatch can now see when and where you work.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save availability. Please try again.';
    return { status: 'error', message: message === 'Unauthorized' ? 'You are not authorised to set availability.' : message };
  }
}
