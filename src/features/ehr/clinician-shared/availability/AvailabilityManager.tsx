'use client';

import { useActionState } from 'react';
import { DAY_CODES, DAY_LABELS, type PractitionerAvailability } from '@/lib/medplum/availability-types';
import { updateMyAvailabilityAction } from './actions';
import { idleAvailabilityState } from './types';

/**
 * Self-service weekly availability for a field clinician. Manages a single
 * recurring window (days + time range) plus covered areas + a note — what the
 * dispatch board needs to know who's free, where, today.
 */
export function AvailabilityManager({ availability }: { availability: PractitionerAvailability }) {
  const [state, formAction, isPending] = useActionState(updateMyAvailabilityAction, idleAvailabilityState);

  const firstSlot = availability.slots[0];
  const selectedDays = new Set(firstSlot?.daysOfWeek ?? []);

  return (
    <section className="clinician-visit-card mt-3">
      <h3 className="h6 mb-1">My availability</h3>
      <p className="text-muted small mb-3">Tell dispatch when and where you work. This drives who gets assigned visits.</p>

      <form action={formAction}>
        <fieldset className="mb-3">
          <legend className="form-label small mb-1">Working days</legend>
          <div className="d-flex flex-wrap gap-2">
            {DAY_CODES.map((code) => (
              <label key={code} className="form-check form-check-inline mb-0">
                <input
                  type="checkbox"
                  name="days"
                  value={code}
                  className="form-check-input"
                  defaultChecked={selectedDays.has(code)}
                />
                <span className="form-check-label small">{DAY_LABELS[code]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="row g-2">
          <div className="col-6 col-md-3">
            <label htmlFor="avail-start" className="form-label small mb-1">From</label>
            <input id="avail-start" name="startTime" type="time" className="form-control form-control-sm" defaultValue={firstSlot?.startTime ?? '09:00'} />
          </div>
          <div className="col-6 col-md-3">
            <label htmlFor="avail-end" className="form-label small mb-1">To</label>
            <input id="avail-end" name="endTime" type="time" className="form-control form-control-sm" defaultValue={firstSlot?.endTime ?? '17:00'} />
          </div>
        </div>

        <div className="mt-2">
          <label htmlFor="avail-areas" className="form-label small mb-1">Areas you cover</label>
          <input
            id="avail-areas"
            name="areas"
            type="text"
            className="form-control form-control-sm"
            defaultValue={availability.areas.join(', ')}
            placeholder="e.g. Maadi, Nasr City, Heliopolis"
          />
          <p className="form-text small mb-0">Comma-separated. Greater Cairo only at launch.</p>
        </div>

        <div className="mt-2">
          <label htmlFor="avail-note" className="form-label small mb-1">Note (optional)</label>
          <input id="avail-note" name="note" type="text" className="form-control form-control-sm" defaultValue={availability.note ?? ''} placeholder="e.g. No Fridays this month" />
        </div>

        {state.status === 'error' ? <div className="alert alert-danger py-2 mb-2 mt-2">{state.message}</div> : null}
        {state.status === 'success' ? <div className="alert alert-success py-2 mb-2 mt-2">{state.message}</div> : null}

        <button type="submit" className="btn btn-sm btn-primary mt-2" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save availability'}
        </button>
        <p className="form-text small mt-2 mb-0">Leave all days unchecked and save to mark yourself unavailable.</p>
      </form>
    </section>
  );
}
