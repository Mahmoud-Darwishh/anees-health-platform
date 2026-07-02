'use client';

import { useActionState, useState } from 'react';
import { createVisitAction } from './actions';
import { idleOpsActionState } from './types';
import type { SchedulingServiceOption, ClinicianOption } from './data';

/**
 * Ops "create visit" form — a thin wrapper over the visit-creation service.
 * Schedules a single visit or a whole package series, optionally assigning a
 * clinician on creation. English-only admin surface.
 */
export function CreateVisitForm({
  services,
  clinicians,
}: {
  services: SchedulingServiceOption[];
  clinicians: ClinicianOption[];
}) {
  const [state, action, pending] = useActionState(createVisitAction, idleOpsActionState);
  const [isSeries, setIsSeries] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="row g-3">
      <div className="col-12 col-md-4">
        <label className="form-label small fw-semibold" htmlFor="cv-patient">Patient case ID</label>
        <input id="cv-patient" name="patientCode" className="form-control form-control-sm" placeholder="AN-3216-0326" required />
      </div>

      <div className="col-12 col-md-5">
        <label className="form-label small fw-semibold" htmlFor="cv-service">Service</label>
        <select id="cv-service" name="serviceId" className="form-select form-select-sm" required defaultValue="">
          <option value="" disabled>Select a service…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.categoryName} · {s.name} · EGP {s.listPriceEgp} · {s.durationMins}m
            </option>
          ))}
        </select>
      </div>

      <div className="col-6 col-md-3">
        <label className="form-label small fw-semibold" htmlFor="cv-type">Visit type</label>
        <select id="cv-type" name="visitType" className="form-select form-select-sm" defaultValue="in_home">
          <option value="in_home">In-home</option>
          <option value="telemedicine">Telemedicine</option>
        </select>
      </div>

      <div className="col-6 col-md-3">
        <label className="form-label small fw-semibold" htmlFor="cv-date">Date</label>
        <input id="cv-date" name="scheduledDate" type="date" className="form-control form-control-sm" defaultValue={today} min={today} required />
      </div>

      <div className="col-6 col-md-3">
        <label className="form-label small fw-semibold" htmlFor="cv-time">Time</label>
        <input id="cv-time" name="scheduledTime" type="time" className="form-control form-control-sm" defaultValue="09:00" />
      </div>

      <div className="col-12 col-md-6">
        <label className="form-label small fw-semibold" htmlFor="cv-staff">Assign clinician (optional)</label>
        <select id="cv-staff" name="staffId" className="form-select form-select-sm" defaultValue="">
          <option value="">Leave unassigned (dispatch later)</option>
          {clinicians.map((c) => (
            <option key={c.staffId} value={c.staffId}>{c.name} ({c.role}) · {c.todayCount} today</option>
          ))}
        </select>
      </div>

      <div className="col-12">
        <div className="form-check">
          <input
            id="cv-series"
            name="isSeries"
            type="checkbox"
            className="form-check-input"
            checked={isSeries}
            onChange={(e) => setIsSeries(e.target.checked)}
          />
          <label className="form-check-label small" htmlFor="cv-series">
            Create a package series (opens a care plan and generates every session)
          </label>
        </div>
      </div>

      {isSeries ? (
        <>
          <div className="col-6 col-md-3">
            <label className="form-label small fw-semibold" htmlFor="cv-count">Sessions</label>
            <input id="cv-count" name="sessionCount" type="number" min={2} max={60} defaultValue={12} className="form-control form-control-sm" />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small fw-semibold" htmlFor="cv-cadence">Every N days</label>
            <input id="cv-cadence" name="cadenceDays" type="number" min={1} max={30} defaultValue={3} className="form-control form-control-sm" />
          </div>
        </>
      ) : null}

      <div className="col-12 d-flex align-items-center gap-3">
        <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>
          {pending ? 'Creating…' : isSeries ? 'Create series' : 'Create visit'}
        </button>
        {state.status === 'success' ? <span className="small text-success">{state.message}</span> : null}
        {state.status === 'error' ? <span className="small text-danger">{state.message}</span> : null}
      </div>
    </form>
  );
}
