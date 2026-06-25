'use client';

import { useActionState } from 'react';
import { recordDoctorNoteAction } from './actions';
import { idleDoctorFormState } from './types';

/** Narrative physician note. Signed on save (FHIR Composition, discipline = medical). */
export function DoctorNoteForm({ visitId }: { visitId: string }) {
  const [state, formAction, isPending] = useActionState(recordDoctorNoteAction, idleDoctorFormState);

  return (
    <form action={formAction} className="clinician-doc-form">
      <input type="hidden" name="visitId" value={visitId} />

      <div className="mb-2">
        <label htmlFor="doctor-note-title" className="form-label small mb-1">Title (optional)</label>
        <input
          id="doctor-note-title"
          name="noteTitle"
          type="text"
          className="form-control form-control-sm"
          placeholder="Physician Note"
          dir="auto"
        />
      </div>

      <div className="mb-2">
        <label htmlFor="doctor-note-body" className="form-label small mb-1">Note</label>
        <textarea
          id="doctor-note-body"
          name="noteBody"
          className="form-control form-control-sm"
          rows={4}
          required
          dir="auto"
          placeholder="Assessment, impression, plan, orders / prescriptions discussed…"
        />
      </div>

      <p className="text-muted small mt-1 mb-2">Once saved the note is signed and locked; changes require a formal amendment.</p>

      {state.status === 'error' ? <div className="alert alert-danger py-2 mb-2">{state.message}</div> : null}
      {state.status === 'success' ? <div className="alert alert-success py-2 mb-2">{state.message}</div> : null}

      <button type="submit" className="btn btn-sm btn-primary" disabled={isPending}>
        {isPending ? 'Signing…' : 'Sign physician note'}
      </button>
    </form>
  );
}
