'use client';

import { useActionState, useState } from 'react';
import { recordNurseMedicationAction } from './actions';
import { idleNurseFormState } from './types';

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Medication administration record (MAR). Records a single dose given / refused /
 * held during the visit. Delegates to the audited admin action (`medication.administer`).
 */
export function NurseMedicationForm({ visitId }: { visitId: string }) {
  const [state, formAction, isPending] = useActionState(recordNurseMedicationAction, idleNurseFormState);
  const [administeredAt] = useState(() => toLocalInputValue(new Date()));

  return (
    <form action={formAction} className="clinician-doc-form">
      <input type="hidden" name="visitId" value={visitId} />

      <div className="row g-2">
        <div className="col-12 col-md-6">
          <label htmlFor="mar-name" className="form-label small mb-1">Medication</label>
          <input
            id="mar-name"
            name="medicationName"
            type="text"
            className="form-control form-control-sm"
            required
            dir="auto"
            placeholder="e.g. Paracetamol 500mg"
          />
        </div>
        <div className="col-6 col-md-3">
          <label htmlFor="mar-status" className="form-label small mb-1">Outcome</label>
          <select id="mar-status" name="administrationStatus" className="form-select form-select-sm" defaultValue="given">
            <option value="given">Given</option>
            <option value="refused">Refused</option>
            <option value="held">Held</option>
          </select>
        </div>
        <div className="col-6 col-md-3">
          <label htmlFor="mar-at" className="form-label small mb-1">Time</label>
          <input
            id="mar-at"
            name="administeredAt"
            type="datetime-local"
            className="form-control form-control-sm"
            defaultValue={administeredAt}
            required
          />
        </div>
      </div>

      <div className="row g-2 mt-1">
        <div className="col-12 col-md-6">
          <label htmlFor="mar-reason" className="form-label small mb-1">Reason (if refused / held)</label>
          <input id="mar-reason" name="administrationReason" type="text" className="form-control form-control-sm" dir="auto" />
        </div>
        <div className="col-12 col-md-6">
          <label htmlFor="mar-note" className="form-label small mb-1">Note</label>
          <input id="mar-note" name="administrationNote" type="text" className="form-control form-control-sm" dir="auto" />
        </div>
      </div>

      {state.status === 'error' ? <div className="alert alert-danger py-2 mb-2 mt-2">{state.message}</div> : null}
      {state.status === 'success' ? <div className="alert alert-success py-2 mb-2 mt-2">{state.message}</div> : null}

      <button type="submit" className="btn btn-sm btn-primary mt-2" disabled={isPending}>
        {isPending ? 'Saving…' : 'Record administration'}
      </button>
    </form>
  );
}
