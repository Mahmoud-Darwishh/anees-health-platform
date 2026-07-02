import { InfoHint } from '../InfoHint';
import type { AdminPatientViewContext } from '../view-context';

const DISCIPLINE_LABEL: Record<string, string> = {
  medical: 'Medical',
  nursing: 'Nursing',
  physiotherapy: 'Physiotherapy',
};

function statusChip(status: string): { label: string; cls: string } {
  if (status === 'final') return { label: 'Signed', cls: 'text-bg-success' };
  if (status === 'amended') return { label: 'Amended', cls: 'text-bg-info' };
  if (status === 'entered-in-error') return { label: 'Entered in error', cls: 'text-bg-danger' };
  return { label: 'Draft', cls: 'text-bg-secondary' };
}

export function ClinicalNotesHistory({
  clinicalNotes,
  clinicalNotesError,
}: {
  clinicalNotes: AdminPatientViewContext['clinicalNotes'];
  clinicalNotesError: AdminPatientViewContext['clinicalNotesError'];
}) {
  return (
    <div id="patient-clinical-notes" className="card bg-white">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h2 className="h6 mb-0 d-inline-flex align-items-center gap-2">
          Clinical notes
          <InfoHint text="Signed clinical documentation (FHIR Composition) authored during visits — physician notes, nursing notes, and physiotherapy session notes. Read-only; amendments create a new version." />
        </h2>
        <span className="text-muted small">{clinicalNotes.length} records</span>
      </div>
      <div className="card-body">
        {clinicalNotesError && (
          <div className="alert alert-warning" role="alert">Could not load clinical notes: {clinicalNotesError}</div>
        )}
        {!clinicalNotesError && clinicalNotes.length === 0 && (
          <div className="alert alert-info mb-0" role="alert">No clinical notes recorded yet.</div>
        )}
        {clinicalNotes.length > 0 && (
          <div className="d-grid gap-2">
            {clinicalNotes.map((note) => {
              const chip = statusChip(note.status);
              return (
                <details key={note.id} className="border rounded p-2">
                  <summary className="d-flex flex-wrap align-items-center gap-2" style={{ cursor: 'pointer' }}>
                    <span className="fw-semibold">{note.title || 'Clinical note'}</span>
                    <span className={`badge ${chip.cls}`}>{chip.label}</span>
                    <span className="badge text-bg-light border">{DISCIPLINE_LABEL[note.discipline] ?? note.discipline}</span>
                    {note.restrictedTier ? <span className="badge text-bg-warning">Restricted</span> : null}
                    <span className="small text-muted ms-auto">
                      {note.date ? new Date(note.date).toLocaleString('en-GB') : '—'}
                      {note.author ? ` · ${note.author}` : ''}
                    </span>
                  </summary>
                  <div className="small mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                    {note.body?.trim() ? note.body : <span className="text-muted">No note body recorded.</span>}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
