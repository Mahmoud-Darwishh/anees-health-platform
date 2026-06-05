'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

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
      <Link href="/en" className="clinician-topbar-btn clinician-topbar-btn--ghost">
        Home
      </Link>
      <button
        type="button"
        className="clinician-topbar-btn clinician-topbar-btn--solid"
        onClick={() => {
          void auditedSignOut();
        }}
        disabled={isSigningOut}
      >
        {isSigningOut ? 'Signing out...' : 'Sign out'}
      </button>
    </div>
  );
}
