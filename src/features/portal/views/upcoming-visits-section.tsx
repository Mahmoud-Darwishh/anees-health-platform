'use client';

import { useActionState, useState } from 'react';
import { requestVisitChangeAction, idlePortalRequestState } from '../actions';
import type { PortalContext } from '../view-context';
import type { PortalUpcomingVisit } from '../data';
import styles from '../portal.module.scss';

/**
 * Upcoming visits (Postgres schedule) + self-service reschedule/cancel REQUESTS.
 * Bilingual — all copy comes from the `portal` message namespace. Requests are
 * routed to ops; they never mutate the schedule directly.
 */
export function UpcomingVisitsSection({ ctx }: { ctx: PortalContext }) {
  const { t, upcomingVisits, canSeeVisits } = ctx;

  if (!canSeeVisits) return null;

  return (
    <div className={`card ${styles.sectionCard}`}>
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0">{t('requests.title')}</h2>
        <span className="text-muted small">{upcomingVisits.length}</span>
      </div>
      <div className="card-body">
        {upcomingVisits.length === 0 ? (
          <div className="alert alert-info mb-0" role="alert">
            {t('requests.empty')}
          </div>
        ) : (
          <ul className="list-group list-group-flush">
            {upcomingVisits.map((visit) => (
              <UpcomingVisitRow key={visit.id} visit={visit} ctx={ctx} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function UpcomingVisitRow({ visit, ctx }: { visit: PortalUpcomingVisit; ctx: PortalContext }) {
  const { t } = ctx;
  const [state, action, pending] = useActionState(requestVisitChangeAction, idlePortalRequestState);
  const [mode, setMode] = useState<'none' | 'reschedule' | 'cancel'>('none');

  const done = state.status === 'success';

  return (
    <li className="list-group-item px-0">
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <div className="fw-semibold">{visit.serviceName}</div>
          <div className="text-muted small">
            {visit.scheduledDate}
            {visit.scheduledTime ? ` · ${visit.scheduledTime}` : ''}
            {visit.providerName ? ` · ${visit.providerName}` : ''}
          </div>
        </div>
        {visit.requestPending || done ? (
          <span className="badge text-bg-light border align-self-center">{t('requests.title')}</span>
        ) : (
          <div className="d-flex gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setMode(mode === 'reschedule' ? 'none' : 'reschedule')}>
              {t('requests.reschedule')}
            </button>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setMode(mode === 'cancel' ? 'none' : 'cancel')}>
              {t('requests.cancel')}
            </button>
          </div>
        )}
      </div>

      {mode !== 'none' && !done && !visit.requestPending ? (
        <form action={action} className="mt-3 d-flex flex-column gap-2">
          <input type="hidden" name="visitId" value={visit.id} />
          <input type="hidden" name="requestType" value={mode} />
          {mode === 'reschedule' ? (
            <div>
              <label className="form-label small mb-1" htmlFor={`pd-${visit.id}`}>{t('requests.preferredDate')}</label>
              <input id={`pd-${visit.id}`} type="date" name="preferredDate" className="form-control form-control-sm" />
            </div>
          ) : null}
          <div>
            <label className="form-label small mb-1" htmlFor={`nt-${visit.id}`}>{t('requests.notes')}</label>
            <input
              id={`nt-${visit.id}`}
              type="text"
              name="note"
              className="form-control form-control-sm"
              placeholder={mode === 'reschedule' ? t('requests.reschedulePlaceholder') : t('requests.cancelPlaceholder')}
            />
          </div>
          <div>
            <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>
              {mode === 'reschedule' ? t('requests.reschedule') : t('requests.cancel')}
            </button>
          </div>
        </form>
      ) : null}

      {state.status === 'success' ? <div className="small text-success mt-2">{state.message}</div> : null}
      {state.status === 'error' ? <div className="small text-danger mt-2">{state.message}</div> : null}
    </li>
  );
}
