'use client';

import { useActionState } from 'react';
import { approveProfileChangeRequestAction, rejectProfileChangeRequestAction } from './actions';
import { idleProfileActionState } from './types';
import type { PendingProfileRequest } from './data';

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <p className="small mb-1"><span className="text-muted">{label}:</span> {value}</p>
  );
}

function RequestCard({ request }: { request: PendingProfileRequest }) {
  const [approveState, approveAction, approvePending] = useActionState(approveProfileChangeRequestAction, idleProfileActionState);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectProfileChangeRequestAction, idleProfileActionState);

  const done = approveState.status === 'success' || rejectState.status === 'success';
  const msg = approveState.status !== 'idle' ? approveState : rejectState.status !== 'idle' ? rejectState : null;

  if (done) {
    return (
      <div className="clinician-visit-card">
        <div className="fw-semibold">{request.staffName} <span className="text-muted small text-capitalize">({request.staffRole})</span></div>
        <p className="small text-success mb-0">{msg?.message}</p>
      </div>
    );
  }

  return (
    <div className="clinician-visit-card">
      <div className="d-flex justify-content-between align-items-start mb-1">
        <div className="fw-semibold">{request.staffName} <span className="text-muted small text-capitalize">({request.staffRole})</span></div>
        <span className="text-muted small">{new Date(request.createdAtIso).toLocaleDateString('en-GB')}</span>
      </div>
      <Field label="Headline" value={request.headline} />
      <Field label="Bio (EN)" value={request.bioEn} />
      <Field label="Bio (AR)" value={request.bioAr} />
      <Field label="Specialties" value={request.specialties} />
      <Field label="Languages" value={request.languages} />
      <Field label="Photo" value={request.photoUrl} />

      <div className="d-flex flex-column gap-2 mt-2">
        <form action={approveAction} className="d-flex gap-2">
          <input type="hidden" name="requestId" value={request.id} />
          <input name="reviewNote" className="form-control form-control-sm" placeholder="Note (optional, shared with the clinician)" dir="auto" />
          <button type="submit" className="btn btn-sm btn-success text-nowrap" disabled={approvePending || rejectPending}>
            {approvePending ? 'Approving…' : 'Approve'}
          </button>
        </form>
        <form action={rejectAction} className="d-flex gap-2">
          <input type="hidden" name="requestId" value={request.id} />
          <input name="reviewNote" className="form-control form-control-sm" placeholder="Reason (optional, shared with the clinician)" dir="auto" />
          <button type="submit" className="btn btn-sm btn-outline-danger text-nowrap" disabled={approvePending || rejectPending}>
            Reject
          </button>
        </form>
      </div>
      {msg?.status === 'error' ? <p className="small text-danger mt-2 mb-0">{msg.message}</p> : null}
    </div>
  );
}

export function ProfileRequestQueue({ requests }: { requests: PendingProfileRequest[] }) {
  if (requests.length === 0) {
    return <div className="alert alert-light border mb-0">No public-profile requests awaiting review.</div>;
  }
  return (
    <div className="clinician-visit-list d-flex flex-column gap-3">
      {requests.map((r) => <RequestCard key={r.id} request={r} />)}
    </div>
  );
}
