'use client';

import { VisitWorkflowActions } from './visit-workflow-actions';
import { VisitDisruptionActions } from './visit-disruption-actions';
import type { VisitVM } from './visit-types';

/** Timeline + geo + recent activity + the live action panel. Shared by the
 *  full card and the expanded compact/agenda row. */
function VisitDetail({ visit, medplumPatientId }: { visit: VisitVM; medplumPatientId: string }) {
  return (
    <>
      <ol className="anees-visit-timeline" aria-label="Visit lifecycle">
        {visit.steps.map((step) => (
          <li key={step.key} className={step.time ? 'is-done' : 'is-pending'}>
            <span className="anees-visit-step-label">{step.label}</span>
            <span className="anees-visit-step-time">{step.time ?? 'Waiting'}</span>
          </li>
        ))}
      </ol>

      {visit.geoChips.length > 0 && (
        <div className="anees-visit-geo" aria-label="Check-in/out location">
          {visit.geoChips.map((chip) => (
            <span key={chip} className="anees-visit-geo-chip">{chip}</span>
          ))}
        </div>
      )}

      {visit.recent.length > 0 && (
        <div className="anees-visit-recent">
          {visit.recent.map((line, index) => (
            <span key={`${visit.id}-recent-${index}`}>{line}</span>
          ))}
        </div>
      )}

      <VisitWorkflowActions medplumPatientId={medplumPatientId} visitId={visit.id} flags={visit.flags} />
      <VisitDisruptionActions medplumPatientId={medplumPatientId} visitId={visit.id} flags={visit.flags} />
    </>
  );
}

/** Full card (Cards view). */
export function VisitCard({ visit, medplumPatientId }: { visit: VisitVM; medplumPatientId: string }) {
  return (
    <article className="anees-visit-card">
      <header className="anees-visit-card-head">
        <div className="anees-visit-card-id">
          <strong>{visit.code}</strong>
          <span>{visit.metaLine}</span>
        </div>
        <span className={`anees-visit-state is-${visit.tone}`}>{visit.stateLabel}</span>
      </header>
      <VisitDetail visit={visit} medplumPatientId={medplumPatientId} />
    </article>
  );
}

/** Dense one-line row that expands to the full detail (Compact + Agenda views). */
export function VisitRow({
  visit,
  medplumPatientId,
  expanded,
  onToggle,
}: {
  visit: VisitVM;
  medplumPatientId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`anees-visit-row ${expanded ? 'is-open' : ''}`}>
      <button type="button" className="anees-visit-row-main" onClick={onToggle} aria-expanded={expanded}>
        <span className="anees-visit-row-chevron" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        <span className="anees-visit-row-code">{visit.code}</span>
        <span className="anees-visit-row-meta">
          {visit.dateLabel}
          {visit.timeLabel ? ` · ${visit.timeLabel}` : ''}
          {visit.providerName ? ` · ${visit.providerName}` : ''}
        </span>
        <span className={`anees-visit-state is-${visit.tone}`}>{visit.stateLabel}</span>
      </button>
      {expanded && (
        <div className="anees-visit-row-detail">
          <VisitDetail visit={visit} medplumPatientId={medplumPatientId} />
        </div>
      )}
    </div>
  );
}
