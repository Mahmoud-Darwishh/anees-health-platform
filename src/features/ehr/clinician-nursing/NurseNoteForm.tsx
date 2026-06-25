'use client';

import { useActionState } from 'react';
import { recordNurseNoteAction } from './actions';
import { idleNurseFormState } from './types';

/** Narrative nursing note. Signed on save (FHIR Composition, discipline = nursing). */
export function NurseNoteForm({ visitId }: { visitId: string }) {
  const [state, formAction, isPending] = useActionState(recordNurseNoteAction, idleNurseFormState);

  return (
    <form action={formAction} className="clinician-doc-form">
      <input type="hidden" name="visitId" value={visitId} />

      <div className="mb-2">
        <label htmlFor="note-title" className="form-label small mb-1">Title (optional)</label>
        <input
          id="note-title"
          name="noteTitle"
          type="text"
          className="form-control form-control-sm"
          placeholder="Nursing Note"
          dir="auto"
        />
      </div>

      <div className="mb-2">
        <label htmlFor="note-body" className="form-label small mb-1">Note</label>
        <textarea
          id="note-body"
          name="noteBody"
          className="form-control form-control-sm"
          rows={4}
          required
          dir="auto"
          placeholder="Subjective findings, care provided, patient response, plan…"
        />
      </div>

      <p className="text-muted small mt-1 mb-2">Once saved the note is signed and locked; changes require a formal amendment.</p>

      {state.status === 'error' ? <div className="alert alert-danger py-2 mb-2">{state.message}</div> : null}
      {state.status === 'success' ? <div className="alert alert-success py-2 mb-2">{state.message}</div> : null}

      <button type="submit" className="btn btn-sm btn-primary" disabled={isPending}>
        {isPending ? 'Signing…' : 'Sign nursing note'}
      </button>
    </form>
  );
}
