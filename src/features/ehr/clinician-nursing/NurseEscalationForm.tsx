'use client';

import { useActionState } from 'react';
import { raiseNurseIncidentAction } from './actions';
import { idleNurseFormState } from './types';

/**
 * Raise an incident / escalation from the doorstep. Logs an incident communication
 * and — when "needs escalation" is ticked — routes an urgent escalation to the
 * care team. Delegates to the audited admin action (`incident_report.create`).
 */
export function NurseEscalationForm({ visitId }: { visitId: string }) {
  const [state, formAction, isPending] = useActionState(raiseNurseIncidentAction, idleNurseFormState);

  return (
    <form action={formAction} className="clinician-doc-form">
      <input type="hidden" name="visitId" value={visitId} />

      <div className="row g-2">
        <div className="col-6 col-md-4">
          <label htmlFor="inc-type" className="form-label small mb-1">Type</label>
          <select id="inc-type" name="incidentType" className="form-select form-select-sm" defaultValue="other">
            <option value="fall">Fall</option>
            <option value="med_error">Medication error</option>
            <option value="pressure_injury">Pressure injury</option>
            <option value="equipment_failure">Equipment failure</option>
            <option value="near_miss">Near miss</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="col-6 col-md-4">
          <label htmlFor="inc-severity" className="form-label small mb-1">Severity</label>
          <select id="inc-severity" name="incidentSeverity" className="form-select form-select-sm" defaultValue="urgent">
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="asap">ASAP</option>
            <option value="stat">Immediate (STAT)</option>
          </select>
        </div>
      </div>

      <div className="mt-2">
        <label htmlFor="inc-summary" className="form-label small mb-1">What happened</label>
        <textarea id="inc-summary" name="incidentSummary" className="form-control form-control-sm" rows={2} required dir="auto" />
      </div>

      <div className="mt-2">
        <label htmlFor="inc-actions" className="form-label small mb-1">Actions taken</label>
        <input id="inc-actions" name="incidentActionsTaken" type="text" className="form-control form-control-sm" dir="auto" />
      </div>

      <div className="form-check mt-2">
        <input id="inc-escalate" name="incidentEscalationNeeded" value="true" type="checkbox" className="form-check-input" defaultChecked />
        <label htmlFor="inc-escalate" className="form-check-label small">Escalate to the care team now (urgent)</label>
      </div>

      {state.status === 'error' ? <div className="alert alert-danger py-2 mb-2 mt-2">{state.message}</div> : null}
      {state.status === 'success' ? <div className="alert alert-success py-2 mb-2 mt-2">{state.message}</div> : null}

      <button type="submit" className="btn btn-sm btn-danger mt-2" disabled={isPending}>
        {isPending ? 'Submitting…' : 'Raise incident'}
      </button>
    </form>
  );
}
