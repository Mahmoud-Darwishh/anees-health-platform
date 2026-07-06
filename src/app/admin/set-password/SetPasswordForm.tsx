'use client';

import { useActionState } from 'react';
import { Button, ButtonLink, Input, Toast } from '@/components/ui';
import { setStaffPasswordAction } from '@/features/admin/staff/actions';
import { idleStaffActionState } from '@/features/admin/staff/types';
import { PASSWORD_REQUIREMENTS_TEXT } from '@/lib/auth/password-rules';

export function SetPasswordForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(setStaffPasswordAction, idleStaffActionState);

  if (state.status === 'success') {
    return (
      <div className="d-flex flex-column gap-3">
        <Toast experience="ops" tone="success" description={state.message} />
        <ButtonLink href="/admin/login" experience="ops">Go to sign in</ButtonLink>
      </div>
    );
  }

  return (
    <form action={formAction} className="d-flex flex-column gap-3" noValidate>
      <input type="hidden" name="token" value={token} />
      <Input
        id="password"
        name="password"
        type="password"
        label="New password"
        hint={PASSWORD_REQUIREMENTS_TEXT}
        autoComplete="new-password"
        required
        experience="ops"
      />
      <Input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        label="Confirm password"
        autoComplete="new-password"
        required
        experience="ops"
      />

      {state.status === 'error' ? <Toast experience="ops" tone="danger" description={state.message} /> : null}

      <Button type="submit" experience="ops" disabled={isPending} loading={isPending}>
        {isPending ? 'Saving...' : 'Set password'}
      </Button>
    </form>
  );
}
