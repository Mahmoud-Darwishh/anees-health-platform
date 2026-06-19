'use client';

import { useActionState } from 'react';
import { reissueCredentialLinkAction, setStaffStatusAction } from './actions';
import { idleStaffActionState } from './types';
import { STATUS_LABELS } from './labels';
import { CopyLinkField } from './CopyLinkField';

type Props = {
  staffId: string;
  currentStatus: string;
  /** True when the row is the signed-in admin's own account (self-lockout guard). */
  isSelf: boolean;
};

export function StaffAccessControls({ staffId, currentStatus, isSelf }: Props) {
  const [statusState, statusAction, statusPending] = useActionState(setStaffStatusAction, idleStaffActionState);
  const [linkState, linkAction, linkPending] = useActionState(reissueCredentialLinkAction, idleStaffActionState);

  return (
    <div className="d-flex flex-column gap-4">
      <div>
        <h2 className="h6">Account status</h2>
        <form action={statusAction} className="d-flex flex-wrap gap-2 align-items-center">
          <input type="hidden" name="staffId" value={staffId} />
          {(['active', 'inactive', 'suspended'] as const).map((status) => (
            <button
              key={status}
              type="submit"
              name="status"
              value={status}
              disabled={statusPending || status === currentStatus || (isSelf && status !== 'active')}
              className={`btn btn-sm ${status === currentStatus ? 'btn-secondary' : status === 'active' ? 'btn-outline-success' : 'btn-outline-danger'}`}
            >
              {status === currentStatus ? `Current: ${STATUS_LABELS[status]}` : `Set ${STATUS_LABELS[status]}`}
            </button>
          ))}
        </form>
        {isSelf ? <p className="text-muted small mt-1 mb-0">You cannot suspend or deactivate your own account.</p> : null}
        {statusState.status === 'error' ? <p className="text-danger small mt-2 mb-0">{statusState.message}</p> : null}
        {statusState.status === 'success' ? <p className="text-success small mt-2 mb-0">{statusState.message}</p> : null}
      </div>

      <div>
        <h2 className="h6">Access link</h2>
        <p className="text-muted small mb-2">
          Send a one-time link so this person can set (or reset) their own password. The platform never stores their
          password and admins never see it.
        </p>
        <form action={linkAction}>
          <input type="hidden" name="staffId" value={staffId} />
          <button type="submit" className="btn btn-sm btn-outline-primary" disabled={linkPending}>
            {linkPending ? 'Generating…' : 'Generate set-password link'}
          </button>
        </form>
        {linkState.status === 'error' ? <p className="text-danger small mt-2 mb-0">{linkState.message}</p> : null}
        {linkState.status === 'success' ? (
          <div className="mt-2">
            <p className="text-success small mb-0">{linkState.message}</p>
            {linkState.inviteUrl ? <CopyLinkField url={linkState.inviteUrl} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
