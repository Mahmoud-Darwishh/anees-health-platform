import type { Metadata } from 'next';
import Image from 'next/image';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getSessionUser, isStaff } from '@/lib/auth/rbac';
import { StaffLoginForm } from './StaffLoginForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Staff sign in · Anees',
  robots: { index: false, follow: false },
};

/**
 * Staff-only sign-in, deliberately separated from the public patient login.
 * Public (no auth gate) — `proxy.ts` allowlists this path so unauthenticated
 * staff can reach it. An already-signed-in staff member is forwarded to their
 * home section via the `/admin` dispatcher.
 */
export default async function StaffLoginPage() {
  const user = await getSessionUser();
  if (isStaff(user)) {
    redirect('/admin');
  }

  return (
    <div className="anees-admin-auth-wrap d-flex justify-content-center align-items-start py-5">
      <div className="card bg-white shadow-sm" style={{ maxWidth: '26rem', width: '100%' }}>
        <div className="card-body p-4">
          <div className="text-center mb-3">
            <Image src="/assets/img/anees-logo.png" alt="Anees Health" width={48} height={48} />
            <h1 className="h5 mt-2 mb-0">Clinical Operations Console</h1>
            <p className="text-muted small mb-0">Staff sign in</p>
          </div>
          <Suspense>
            <StaffLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
