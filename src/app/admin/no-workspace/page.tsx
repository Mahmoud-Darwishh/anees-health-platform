import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser, isStaff } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

/**
 * Landing for authenticated staff whose role has no workspace built yet
 * (e.g. `hospital_partner_admin`, `viewer`). It keeps them inside the staff
 * shell with a clear message instead of dumping them on the public site.
 */
export default async function AdminNoWorkspacePage() {
  const user = await getSessionUser();

  if (!isStaff(user)) {
    redirect('/en/auth/login?callbackUrl=/admin');
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <div className="text-center">
        <h1 className="h3 mb-3">No workspace assigned yet</h1>
        <p className="text-muted mb-4">
          Your account ({user.staffRole}) is active, but there is no console
          section available for this role at the moment. If you believe this is a
          mistake, please contact your platform administrator.
        </p>
        <Link href="/en" className="btn btn-outline-secondary">
          Back to Anees Health
        </Link>
      </div>
    </div>
  );
}
