'use client';

import { useActionState, useState } from 'react';
import { Badge, Button, EmptyState, Input, StatusPill } from '@/components/ui';
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
          <EmptyState experience="ops" compact title={t('requests.empty')} />
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
          <Badge tone="info" className="align-self-center">{t('requests.title')}</Badge>
        ) : (
          <div className="d-flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              experience="ops"
              onClick={() => setMode(mode === 'reschedule' ? 'none' : 'reschedule')}
            >
              {t('requests.reschedule')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              experience="ops"
              onClick={() => setMode(mode === 'cancel' ? 'none' : 'cancel')}
            >
              {t('requests.cancel')}
            </Button>
          </div>
        )}
      </div>

      {mode !== 'none' && !done && !visit.requestPending ? (
        <form action={action} className="mt-3 d-flex flex-column gap-2">
          <input type="hidden" name="visitId" value={visit.id} />
          <input type="hidden" name="requestType" value={mode} />
          {mode === 'reschedule' ? (
            <Input
              id={`pd-${visit.id}`}
              type="date"
              name="preferredDate"
              label={t('requests.preferredDate')}
              controlSize="sm"
              experience="ops"
            />
          ) : null}
          <Input
            id={`nt-${visit.id}`}
            type="text"
            name="note"
            label={t('requests.notes')}
            placeholder={mode === 'reschedule' ? t('requests.reschedulePlaceholder') : t('requests.cancelPlaceholder')}
            controlSize="sm"
            experience="ops"
          />
          <div>
            <Button type="submit" size="sm" experience="ops" disabled={pending} loading={pending}>
              {mode === 'reschedule' ? t('requests.reschedule') : t('requests.cancel')}
            </Button>
          </div>
        </form>
      ) : null}

      {state.status === 'success' ? (
        <StatusPill tone="success" className="mt-2">{state.message}</StatusPill>
      ) : null}
      {state.status === 'error' ? (
        <StatusPill tone="danger" className="mt-2">{state.message}</StatusPill>
      ) : null}
    </li>
  );
}
