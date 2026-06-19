import Link from 'next/link';
import type { ClinicianTodayData, ClinicianTodayVisit } from '@/features/ehr/clinician-shared/visit-flow';
import { VisitTransitionForm } from '@/features/ehr/clinician-physio/VisitTransitionForm';
import {
  nurseAcknowledgeVisitAction,
  nurseStartTravelAction,
  nurseMarkArrivedAction,
  nurseCheckInVisitAction,
  nurseCheckOutVisitAction,
} from './actions';

function flowLabel(state: ClinicianTodayVisit['flowState']): string {
  if (state === 'scheduled') return 'Scheduled';
  if (state === 'acknowledged') return 'Acknowledged';
  if (state === 'en_route') return 'En route';
  if (state === 'arrived') return 'Arrived';
  if (state === 'checked_in') return 'Checked in';
  if (state === 'checked_out') return 'Checked out';
  return 'Closed';
}

function workflowStateLabel(state: string): string {
  return state
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function flowClassName(state: ClinicianTodayVisit['flowState']): string {
  if (state === 'checked_in') return 'clinician-chip is-progress';
  if (state === 'checked_out' || state === 'closed') return 'clinician-chip is-done';
  if (state === 'en_route' || state === 'arrived') return 'clinician-chip is-active';
  return 'clinician-chip';
}

function actionConfig(actionType: ClinicianTodayVisit['primaryAction']) {
  if (actionType === 'acknowledge') {
    return { label: 'Acknowledge', transitionType: 'acknowledge' as const, action: nurseAcknowledgeVisitAction };
  }
  if (actionType === 'start_travel') {
    return { label: 'Start travel', transitionType: 'start_travel' as const, action: nurseStartTravelAction };
  }
  if (actionType === 'mark_arrived') {
    return { label: "I've arrived", transitionType: 'mark_arrived' as const, action: nurseMarkArrivedAction };
  }
  if (actionType === 'check_in') {
    return { label: 'Check in', transitionType: 'check_in' as const, action: nurseCheckInVisitAction };
  }
  if (actionType === 'document_session') {
    return { label: 'Open visit', transitionType: null, action: null };
  }
  if (actionType === 'check_out') {
    return { label: 'Check out', transitionType: 'check_out' as const, action: nurseCheckOutVisitAction };
  }
  return null;
}

export function NurseTodayView({ data }: { data: ClinicianTodayData }) {
  return (
    <section className="clinician-surface">
      <header className="mb-3">
        <h2 className="h5 mb-1">My Journey</h2>
        <p className="text-muted mb-0">{data.dateLabel}</p>
      </header>

      <div className="clinician-stats-grid mb-3">
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">Total visits</p>
          <p className="clinician-stat-value mb-0">{data.totalVisits}</p>
        </article>
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">Completed</p>
          <p className="clinician-stat-value mb-0">{data.completedVisits}</p>
        </article>
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">In progress</p>
          <p className="clinician-stat-value mb-0">{data.inProgressVisits}</p>
        </article>
        <article className="clinician-stat-card">
          <p className="clinician-stat-label mb-1">Upcoming</p>
          <p className="clinician-stat-value mb-0">{data.upcomingVisits}</p>
        </article>
      </div>

      {data.warning ? <div className="alert alert-warning py-2">{data.warning}</div> : null}

      {data.visits.length === 0 ? (
        <div className="alert alert-light border">No visits are assigned for today.</div>
      ) : (
        <div className="clinician-visit-list">
          {data.visits.map((visit) => {
            const config = actionConfig(visit.primaryAction);
            const medplumPatientId = visit.patient.medplumPatientId;
            return (
              <article key={visit.id} className="clinician-visit-card">
                <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                  <div>
                    <p className="clinician-visit-time mb-1">{visit.scheduledTime?.trim() || 'Time not set'}</p>
                    <h3 className="h6 mb-0">{visit.patient.fullName}</h3>
                    {visit.patient.arabicName ? (
                      <p className="text-muted mb-0 small">{visit.patient.arabicName}</p>
                    ) : null}
                  </div>
                  <span className={flowClassName(visit.flowState)}>{flowLabel(visit.flowState)}</span>
                </div>

                <p className="mb-1 small text-muted">
                  {visit.serviceName}
                  {visit.areaName ? ` · ${visit.areaName}` : ''}
                  {visit.patient.age !== null ? ` · ${visit.patient.age}y` : ''}
                </p>

                <p className="mb-1 small text-muted">Workflow: {workflowStateLabel(visit.effectiveState)}</p>

                <p className="mb-1 small text-muted">
                  {visit.patient.addressDetail ?? 'Address unavailable'}
                  {visit.patient.landmark ? ` · ${visit.patient.landmark}` : ''}
                </p>

                <div className="d-flex flex-wrap gap-2 mb-3">
                  {visit.patient.dnrStatus === 'dnr' ? <span className="badge text-bg-warning">DNR</span> : null}
                  <span className="badge text-bg-light border">{visit.code}</span>
                  {visit.patient.geofenceRadiusMeters ? (
                    <span className="badge text-bg-light border">Geofence {visit.patient.geofenceRadiusMeters}m</span>
                  ) : null}
                </div>

                <div className="d-flex align-items-center gap-2 flex-wrap">
                  {config?.transitionType && visit.canTransition ? (
                    <VisitTransitionForm
                      action={config.action}
                      label={config.label}
                      transitionType={config.transitionType}
                      visitId={visit.id}
                    />
                  ) : config && visit.primaryAction === 'document_session' ? (
                    <Link href={`/clinician/nursing/visits/${visit.id}/session`} className="btn btn-sm btn-primary">
                      {config.label}
                    </Link>
                  ) : (
                    <Link href={`/clinician/nursing/visits/${visit.id}/session`} className="btn btn-sm btn-outline-secondary">
                      Open visit
                    </Link>
                  )}

                  <Link
                    href={medplumPatientId ? `/admin/patients/${medplumPatientId}` : '/admin/patients'}
                    className="btn btn-sm btn-outline-secondary"
                  >
                    View chart
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
