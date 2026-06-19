'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { setStaffPasswordAction } from '@/features/admin/staff/actions';
import { idleStaffActionState } from '@/features/admin/staff/types';
import { PASSWORD_REQUIREMENTS_TEXT } from '@/lib/auth/password-rules';

export function SetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(setStaffPasswordAction, idleStaffActionState);

  if (state.status === 'success') {
    return (
      <div className="d-flex flex-column gap-3">
        <div className="alert alert-success mb-0" role="status">{state.message}</div>
        <Link href="/admin/login" className="btn btn-primary">Go to sign in</Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="d-flex flex-column gap-3" noValidate>
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="form-label">New password</label>
        <input id="password" name="password" type="password" className="form-control" autoComplete="new-password" required />
        <div className="form-text">{PASSWORD_REQUIREMENTS_TEXT}</div>
      </div>
      <div>
        <label htmlFor="confirmPassword" className="form-label">Confirm password</label>
        <input id="confirmPassword" name="confirmPassword" type="password" className="form-control" autoComplete="new-password" required />
      </div>

      {state.status === 'error' ? <div className="alert alert-danger py-2 mb-0" role="alert">{state.message}</div> : null}

      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? 'Saving…' : 'Set password'}
      </button>
    </form>
  );
}
