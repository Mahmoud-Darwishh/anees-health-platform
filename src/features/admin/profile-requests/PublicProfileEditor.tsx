'use client';

import { useActionState } from 'react';
import { submitProfileChangeRequestAction } from './actions';
import { idleProfileActionState } from './types';
import type { MyProfileRequest } from './data';

function statusBadge(status: string): string {
  if (status === 'approved') return 'bg-success';
  if (status === 'rejected') return 'bg-danger';
  return 'bg-warning text-dark';
}

export function PublicProfileEditor({ latest }: { latest: MyProfileRequest | null }) {
  const [state, action, pending] = useActionState(submitProfileChangeRequestAction, idleProfileActionState);

  return (
    <div className="clinician-visit-card">
      <div className="d-flex justify-content-between align-items-center mb-1">
        <h3 className="h6 mb-0">Public profile</h3>
        {latest ? <span className={`badge ${statusBadge(latest.status)} text-capitalize`}>{latest.status}</span> : null}
      </div>
      <p className="text-muted small">
        Propose how you appear publicly. Changes are reviewed by an administrator before they go live.
      </p>
      {latest?.status === 'rejected' && latest.reviewNote ? (
        <div className="alert alert-warning py-2 small">Last request was not approved: {latest.reviewNote}</div>
      ) : null}

      <form action={action} className="d-flex flex-column gap-2">
        <div>
          <label htmlFor="pp-headline" className="form-label small mb-1">Headline / professional title</label>
          <input id="pp-headline" name="headline" className="form-control form-control-sm" defaultValue={latest?.headline ?? ''} dir="auto" />
        </div>
        <div className="row g-2">
          <div className="col-12 col-md-6">
            <label htmlFor="pp-bioEn" className="form-label small mb-1">Bio (English)</label>
            <textarea id="pp-bioEn" name="bioEn" rows={3} className="form-control form-control-sm" defaultValue={latest?.bioEn ?? ''} dir="ltr" />
          </div>
          <div className="col-12 col-md-6">
            <label htmlFor="pp-bioAr" className="form-label small mb-1">Bio (Arabic)</label>
            <textarea id="pp-bioAr" name="bioAr" rows={3} className="form-control form-control-sm" defaultValue={latest?.bioAr ?? ''} dir="rtl" />
          </div>
        </div>
        <div className="row g-2">
          <div className="col-12 col-md-6">
            <label htmlFor="pp-specialties" className="form-label small mb-1">Specialties (comma-separated)</label>
            <input id="pp-specialties" name="specialties" className="form-control form-control-sm" defaultValue={latest?.specialties ?? ''} dir="auto" />
          </div>
          <div className="col-12 col-md-6">
            <label htmlFor="pp-languages" className="form-label small mb-1">Languages (comma-separated)</label>
            <input id="pp-languages" name="languages" className="form-control form-control-sm" defaultValue={latest?.languages ?? ''} dir="auto" />
          </div>
        </div>
        <div>
          <label htmlFor="pp-photoUrl" className="form-label small mb-1">Photo URL (https)</label>
          <input id="pp-photoUrl" name="photoUrl" type="url" className="form-control form-control-sm" defaultValue={latest?.photoUrl ?? ''} dir="ltr" placeholder="https://…" />
        </div>

        {state.status === 'error' ? <div className="alert alert-danger py-2 mb-0">{state.message}</div> : null}
        {state.status === 'success' ? <div className="alert alert-success py-2 mb-0">{state.message}</div> : null}

        <div>
          <button type="submit" className="btn btn-sm btn-primary" disabled={pending}>
            {pending ? 'Submitting…' : 'Submit for review'}
          </button>
        </div>
      </form>
    </div>
  );
}
