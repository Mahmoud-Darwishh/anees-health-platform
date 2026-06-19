'use client';

import { useActionState } from 'react';
import { recordNurseAssessmentAction } from './actions';
import { idleNurseFormState } from './types';

/** Common nurse-discipline validated instruments (kept minimal; free-text title also allowed). */
const NURSE_INSTRUMENTS: { value: string; label: string }[] = [
  { value: '', label: '— none / free-text —' },
  { value: 'braden', label: 'Braden (pressure-injury risk)' },
  { value: 'morse', label: 'Morse (falls risk)' },
  { value: 'mmse', label: 'MMSE (cognition)' },
];

export function NurseAssessmentForm({ visitId }: { visitId: string }) {
  const [state, formAction, isPending] = useActionState(recordNurseAssessmentAction, idleNurseFormState);

  return (
    <form action={formAction} className="clinician-doc-form">
      <input type="hidden" name="visitId" value={visitId} />

      <div className="row g-2">
        <div className="col-12 col-md-6">
          <label htmlFor="assess-instrument" className="form-label small mb-1">Validated instrument</label>
          <select id="assess-instrument" name="assessmentInstrument" className="form-select form-select-sm" defaultValue="">
            {NURSE_INSTRUMENTS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-6">
          <label htmlFor="assess-title" className="form-label small mb-1">Title (if free-text)</label>
          <input id="assess-title" name="assessmentTitle" type="text" className="form-control form-control-sm" dir="auto" />
        </div>
        <div className="col-6 col-md-4">
          <label htmlFor="assess-type" className="form-label small mb-1">Type</label>
          <select id="assess-type" name="assessmentType" className="form-select form-select-sm" defaultValue="other">
            <option value="functional">Functional</option>
            <option value="mobility">Mobility</option>
            <option value="pain">Pain</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="col-6 col-md-4">
          <label htmlFor="assess-score" className="form-label small mb-1">Score</label>
          <input id="assess-score" name="assessmentScore" type="number" inputMode="decimal" className="form-control form-control-sm" step="0.1" />
        </div>
      </div>

      <div className="mt-2">
        <label htmlFor="assess-summary" className="form-label small mb-1">Summary</label>
        <textarea id="assess-summary" name="assessmentSummary" className="form-control form-control-sm" rows={2} required dir="auto" />
      </div>

      <p className="text-muted small mt-2 mb-2">Choose a validated instrument or enter a title. A summary is required.</p>

      {state.status === 'error' ? <div className="alert alert-danger py-2 mb-2">{state.message}</div> : null}
      {state.status === 'success' ? <div className="alert alert-success py-2 mb-2">{state.message}</div> : null}

      <button type="submit" className="btn btn-sm btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Record assessment'}
      </button>
    </form>
  );
}
