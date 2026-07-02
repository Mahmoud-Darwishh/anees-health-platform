'use client';

import { useActionState } from 'react';
import { resolveDisputeAction } from './actions';
import { idleOpsActionState } from './types';

/**
 * Per-row dispute resolution control for the ops disputes queue.
 * Uphold (dispute rejected → visit stands) or admin force-close (terminal).
 * English-only admin surface.
 */
export function DisputeResolveControl({ visitId, code }: { visitId: string; code: string }) {
  const [state, action, pending] = useActionState(resolveDisputeAction, idleOpsActionState);

  return (
    <form action={action} className="d-flex flex-column gap-1" style={{ minWidth: '13rem' }}>
      <input type="hidden" name="visitId" value={visitId} />
      <input
        type="text"
        name="reasonNote"
        className="form-control form-control-sm"
        placeholder={`Reason for ${code}…`}
        aria-label={`Resolution reason for visit ${code}`}
      />
      <div className="d-flex gap-1">
        <button
          type="submit"
          name="resolution"
          value="uphold"
          className="btn btn-sm btn-outline-success"
          disabled={pending}
        >
          Uphold
        </button>
        <button
          type="submit"
          name="resolution"
          value="force_close"
          className="btn btn-sm btn-outline-danger"
          disabled={pending}
        >
          Force-close
        </button>
      </div>
      {state.status === 'success' ? <span className="small text-success">{state.message}</span> : null}
      {state.status === 'error' ? <span className="small text-danger">{state.message}</span> : null}
    </form>
  );
}
