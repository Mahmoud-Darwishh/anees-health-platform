'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Button, ButtonLink } from '@/components/ui';

export function ClinicianTopbarActions() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const auditedSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      await fetch('/api/auth/logout-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      });
    } catch {
      // Best-effort only; auth sign-out should proceed even if audit write fails.
    }

    await signOut({ callbackUrl: '/en' });
  };

  return (
    <div className="clinician-topbar-actions">
      <ButtonLink href="/en" variant="ghost" size="sm" experience="clinical" className="clinician-topbar-btn clinician-topbar-btn--ghost">
        Home
      </ButtonLink>
      <Button
        type="button"
        size="sm"
        experience="clinical"
        className="clinician-topbar-btn clinician-topbar-btn--solid"
        onClick={() => {
          void auditedSignOut();
        }}
        disabled={isSigningOut}
        loading={isSigningOut}
      >
        {isSigningOut ? 'Signing out...' : 'Sign out'}
      </Button>
    </div>
  );
}
