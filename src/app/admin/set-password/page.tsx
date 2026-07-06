import type { Metadata } from 'next';
import Image from 'next/image';
import { ButtonLink, Toast } from '@/components/ui';
import { resolveAccountToken } from '@/lib/auth/account-tokens';
import { SetPasswordForm } from './SetPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Set your password · Anees',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ token?: string }> };

/**
 * Public page (allowlisted in `proxy.ts`). The single-use invite token IS the
 * authorization. We only PEEK here (no consume) so the form can render; the
 * token is consumed when the password is actually set.
 */
export default async function SetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  const resolved = await resolveAccountToken('staff_invite', token ?? null, { consume: false });

  return (
    <div className="anees-admin-auth-wrap d-flex justify-content-center align-items-start py-5">
      <div className="card bg-white shadow-sm" style={{ maxWidth: '26rem', width: '100%' }}>
        <div className="card-body p-4">
          <div className="text-center mb-3">
            <Image src="/assets/img/anees-logo.png" alt="Anees Health" width={48} height={48} />
            <h1 className="h5 mt-2 mb-0">Set your password</h1>
            <p className="text-muted small mb-0">Anees Clinical Operations Console</p>
          </div>

          {resolved && token ? (
            <SetPasswordForm token={token} />
          ) : (
            <div className="d-flex flex-column gap-3">
              <Toast
                experience="ops"
                tone="danger"
                description="This link is invalid or has expired. Ask an administrator to send you a new one."
              />
              <ButtonLink href="/admin/login" variant="outline" experience="ops">Back to sign in</ButtonLink>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
