'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { assignVisitClinicianAction } from './actions';
import { idleOpsActionState } from './types';
import type { DispatchBoardData, DispatchVisit, ClinicianOption } from './data';

const dateFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });

function whenLabel(visit: DispatchVisit): string {
  const date = dateFmt.format(new Date(visit.scheduledDateIso));
  return visit.scheduledTime ? `${date} · ${visit.scheduledTime}` : date;
}

function AssignControl({ visit, clinicians }: { visit: DispatchVisit; clinicians: ClinicianOption[] }) {
  const [state, action, pending] = useActionState(assignVisitClinicianAction, idleOpsActionState);

  if (state.status === 'success') {
    return <span className="small text-success">{state.message}</span>;
  }

  return (
    <form action={action} className="d-flex gap-2 align-items-center flex-wrap justify-content-end">
      <input type="hidden" name="visitId" value={visit.id} />
      <select name="staffId" className="form-select form-select-sm" style={{ maxWidth: '12rem' }} required defaultValue="">
        <option value="" disabled>{visit.clinicianName ? 'Reassign to…' : 'Assign clinician…'}</option>
        {clinicians.map((c) => {
          const avail = !c.availabilitySet ? '' : c.availableToday ? ' · ✓ available' : ' · off today';
          return (
            <option key={c.staffId} value={c.staffId}>{c.name} ({c.role}) · {c.todayCount} today{avail}</option>
          );
        })}
      </select>
      <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>
        {pending ? '…' : visit.clinicianName ? 'Reassign' : 'Assign'}
      </button>
      {state.status === 'error' ? <span className="small text-danger w-100 text-end">{state.message}</span> : null}
    </form>
  );
}

function VisitRow({ visit, clinicians }: { visit: DispatchVisit; clinicians: ClinicianOption[] }) {
  return (
    <tr>
      <td className="small text-nowrap">
        {whenLabel(visit)}
        {visit.overdue ? <div><span className="badge text-bg-danger mt-1">Overdue</span></div> : null}
      </td>
      <td>
        <div className="fw-semibold">{visit.patient.fullName}</div>
        <div className="small text-muted">{visit.patient.code}{visit.patient.dnr ? ' · ' : ''}{visit.patient.dnr ? <span className="badge text-bg-warning">DNR</span> : null}</div>
      </td>
      <td className="small">{visit.serviceName}<div className="text-muted text-capitalize">{visit.visitType.replace(/_/g, ' ')}</div></td>
      <td className="small">{visit.clinicianName ?? <span className="text-warning-emphasis">Unassigned</span>}</td>
      <td className="text-end" style={{ minWidth: '15rem' }}><AssignControl visit={visit} clinicians={clinicians} /></td>
    </tr>
  );
}

function statusChip(visit: DispatchVisit): { label: string; cls: string } {
  const raw = visit.state ?? visit.status;
  const label = raw.replace(/_/g, ' ');
  let cls = 'text-bg-secondary';
  if (raw === 'completed' || raw === 'checked_out') cls = 'text-bg-success';
  else if (raw === 'checked_in' || raw === 'arrived' || raw === 'en_route' || raw === 'documenting') cls = 'text-bg-primary';
  else if (raw.includes('cancel') || raw === 'no_show' || raw === 'disputed' || raw === 'abandoned' || raw.includes('refused')) cls = 'text-bg-danger';
  return { label, cls };
}

function TodayLane({ visits }: { visits: DispatchVisit[] }) {
  if (visits.length === 0) {
    return <div className="alert alert-light border mb-0">No visits scheduled for today.</div>;
  }
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0">
        <thead>
          <tr><th>Time</th><th>Patient</th><th>Service</th><th>Clinician</th><th>Status</th><th aria-label="Manage" /></tr>
        </thead>
        <tbody>
          {visits.map((v) => {
            const chip = statusChip(v);
            return (
              <tr key={v.id}>
                <td className="small text-nowrap">{v.scheduledTime ?? '—'}</td>
                <td className="small">{v.patient.fullName}{v.patient.dnr ? ' ' : ''}{v.patient.dnr ? <span className="badge text-bg-warning">DNR</span> : null}</td>
                <td className="small">{v.serviceName}</td>
                <td className="small">{v.clinicianName ?? <span className="text-warning-emphasis">Unassigned</span>}</td>
                <td><span className={`badge ${chip.cls} text-capitalize`}>{chip.label}</span></td>
                <td className="text-end">
                  {v.patient.medplumPatientId ? (
                    <Link href={`/admin/patients/${v.patient.medplumPatientId}`} className="btn btn-sm btn-outline-secondary">Manage</Link>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function VisitTable({ visits, clinicians, emptyText }: { visits: DispatchVisit[]; clinicians: ClinicianOption[]; emptyText: string }) {
  if (visits.length === 0) {
    return <div className="alert alert-light border mb-0">{emptyText}</div>;
  }
  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0">
        <thead>
          <tr><th>When</th><th>Patient</th><th>Service</th><th>Clinician</th><th aria-label="Assign" /></tr>
        </thead>
        <tbody>
          {visits.map((v) => <VisitRow key={v.id} visit={v} clinicians={clinicians} />)}
        </tbody>
      </table>
    </div>
  );
}

export function DispatchBoardView({ data }: { data: DispatchBoardData }) {
  return (
    <div className="d-flex flex-column gap-4">
      <div className="card bg-white">
        <div className="card-body">
          <h2 className="h6">Clinician capacity — today</h2>
          <p className="text-muted small">Who&apos;s available, where, and their load. Availability is declared by each clinician in their profile.</p>
          {data.clinicians.length === 0 ? (
            <div className="alert alert-light border mb-0">
              No assignable clinicians. Add staff with a linked provider profile in <Link href="/admin/staff">Staff</Link>.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr><th>Clinician</th><th>Today</th><th>Areas</th><th>Load</th></tr>
                </thead>
                <tbody>
                  {data.clinicians.map((c) => {
                    let avail: { label: string; cls: string };
                    if (!c.availabilitySet) avail = { label: 'Not set', cls: 'text-bg-light border' };
                    else if (c.availableToday) avail = { label: `Available ${c.todayWindowLabel}`, cls: 'text-bg-success' };
                    else avail = { label: 'Off today', cls: 'text-bg-secondary' };
                    return (
                      <tr key={c.staffId}>
                        <td className="small">{c.name} <span className="text-muted">({c.role})</span></td>
                        <td><span className={`badge ${avail.cls}`}>{avail.label}</span></td>
                        <td className="small text-muted">{c.areas.length ? c.areas.join(', ') : '—'}</td>
                        <td className="small"><strong>{c.todayCount}</strong> today</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card bg-white">
        <div className="card-body">
          <h2 className="h6">Today ({data.todays.length})</h2>
          <p className="text-muted small">Live status of today&apos;s visits. Open a patient to handle a no-show, reschedule, or disruption.</p>
          <TodayLane visits={data.todays} />
        </div>
      </div>

      <div className="card bg-white">
        <div className="card-body">
          <h2 className="h6">Needs assignment ({data.unassigned.length})</h2>
          <p className="text-muted small">Paid bookings converted to visits that still need a clinician. Assign to dispatch.</p>
          <VisitTable visits={data.unassigned} clinicians={data.clinicians} emptyText="Nothing waiting — every visit is assigned." />
        </div>
      </div>

      <div className="card bg-white">
        <div className="card-body">
          <h2 className="h6">Scheduled — next 2 days ({data.upcoming.length})</h2>
          <VisitTable visits={data.upcoming} clinicians={data.clinicians} emptyText="No assigned visits in the next 2 days." />
        </div>
      </div>
    </div>
  );
}
