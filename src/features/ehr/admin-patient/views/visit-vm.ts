import { workflowStateLabel } from '../view-helpers';
import type { AdminPatientViewContext } from '../view-context';
import type { VisitVM, VisitTone } from './visit-types';

type LocalVisit = AdminPatientViewContext['localVisits'][number];

function visitStateTone(state: string): VisitTone {
  const s = state.toLowerCase();
  if (s.includes('checked_out') || s.includes('completed') || s.includes('signed')) {
    return 'ok';
  }
  if (
    s.includes('cancel') ||
    s.includes('dispute') ||
    s.includes('abandon') ||
    s.includes('force_closed') ||
    s.includes('no_show') ||
    s.includes('refused') ||
    s.includes('not_home') ||
    s.includes('declined') ||
    s.includes('expired')
  ) {
    return 'danger';
  }
  if (
    s.includes('acknowledg') ||
    s.includes('en_route') ||
    s.includes('arrived') ||
    s.includes('checked_in') ||
    s.includes('documenting') ||
    s.includes('progress')
  ) {
    return 'active';
  }
  return 'muted';
}

export function isClosedState(state: string): boolean {
  const s = state.toLowerCase();
  return (
    s.includes('completed') ||
    s.includes('cancel') ||
    s.includes('no_show') ||
    s.includes('refused') ||
    s.includes('not_home') ||
    s.includes('declined') ||
    s.includes('force_closed')
  );
}

function isInProgress(visit: LocalVisit): boolean {
  return Boolean(visit.checkInAt && !visit.checkOutAt);
}

function formatStamp(value?: string | Date | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function statusRank(visit: LocalVisit, closed: boolean): number {
  if (closed) return 7;
  if (visit.checkOutAt) return 6;
  if (visit.checkInAt) return 5;
  if (visit.arrivedAt) return 4;
  if (visit.enRouteAt) return 3;
  if (visit.acknowledgedAt) return 2;
  return 1;
}

function dayInfo(scheduledMs: number, now: number): { dayKey: string; dayHeading: string; dateLabel: string } {
  const date = new Date(scheduledMs);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((startOfDay.getTime() - today.getTime()) / 86_400_000);
  const dateLabel = date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });

  let dayHeading = dateLabel;
  if (diffDays === 0) dayHeading = `Today · ${dateLabel}`;
  else if (diffDays === 1) dayHeading = `Tomorrow · ${dateLabel}`;
  else if (diffDays === -1) dayHeading = `Yesterday · ${dateLabel}`;

  return {
    dayKey: `${startOfDay.getFullYear()}-${startOfDay.getMonth()}-${startOfDay.getDate()}`,
    dayHeading,
    dateLabel,
  };
}

/**
 * Build the board view-models for a patient's visits. Reads the clock here (a
 * plain async-free helper, not a component) so the relative day/filter maths
 * stays out of the render path.
 */
export function buildVisitVMList(localVisits: LocalVisit[]): VisitVM[] {
  const now = Date.now();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();
  return localVisits.map((visit) => buildVisitVM(visit, now, startOfTodayMs));
}

function buildVisitVM(visit: LocalVisit, now: number, startOfTodayMs: number): VisitVM {
  const closed = isClosedState(visit.effectiveState);
  const inProgress = isInProgress(visit);
  const scheduledMs = new Date(visit.scheduledDate).getTime();
  const safeScheduledMs = Number.isNaN(scheduledMs) ? now : scheduledMs;
  const { dayKey, dayHeading, dateLabel } = dayInfo(safeScheduledMs, now);
  const providerName = visit.providerName ?? '';
  const stateLabel = workflowStateLabel(visit.effectiveState);

  const geoChips: string[] = [];
  if (visit.checkInLat && visit.checkInLng) geoChips.push(`In · ${visit.checkInLat}, ${visit.checkInLng}`);
  if (visit.checkOutLat && visit.checkOutLng) geoChips.push(`Out · ${visit.checkOutLat}, ${visit.checkOutLng}`);
  if (visit.checkInAccuracyM != null) geoChips.push(`± ${visit.checkInAccuracyM} m`);

  const metaParts = [
    dateLabel,
    visit.scheduledTime || null,
    providerName || null,
  ].filter(Boolean) as string[];

  return {
    id: visit.id,
    code: visit.code,
    metaLine: metaParts.join(' · '),
    stateLabel,
    tone: visitStateTone(visit.effectiveState),
    scheduledMs: safeScheduledMs,
    providerName,
    dateLabel,
    timeLabel: visit.scheduledTime ?? '',
    dayKey,
    dayHeading,
    statusRank: statusRank(visit, closed),
    searchText: `${visit.code} ${providerName} ${stateLabel}`.toLowerCase(),
    steps: [
      { key: 'ack', label: 'Acknowledged', time: formatStamp(visit.acknowledgedAt) },
      { key: 'enroute', label: 'En route', time: formatStamp(visit.enRouteAt) },
      { key: 'arrived', label: 'Arrived', time: formatStamp(visit.arrivedAt) },
      { key: 'checkin', label: 'Checked in', time: formatStamp(visit.checkInAt) },
      { key: 'checkout', label: 'Checked out', time: formatStamp(visit.checkOutAt) },
    ],
    geoChips,
    recent: visit.transitionTimeline.slice(0, 2).map((entry) => {
      const stamp = formatStamp(entry.createdAt);
      const override = entry.isOverride ? ` · override (${entry.overrideMethod ?? 'manual'})` : '';
      return `${workflowStateLabel(entry.toState)} · ${stamp ?? '—'}${override}`;
    }),
    flags: {
      acknowledged: Boolean(visit.acknowledgedAt),
      enRoute: Boolean(visit.enRouteAt),
      arrived: Boolean(visit.arrivedAt),
      checkedIn: Boolean(visit.checkInAt),
      checkedOut: Boolean(visit.checkOutAt),
      closed,
    },
    filters: {
      open: !closed,
      inProgress,
      upcoming: !closed && safeScheduledMs >= startOfTodayMs,
      last7: safeScheduledMs >= now - 7 * 86_400_000 && safeScheduledMs <= now + 86_400_000,
      past: closed || safeScheduledMs < startOfTodayMs,
    },
  };
}
