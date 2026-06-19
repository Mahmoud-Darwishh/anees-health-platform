import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';
import { getPendingProfileRequests } from '@/features/admin/profile-requests/data';
import { ProfileRequestQueue } from '@/features/admin/profile-requests/ProfileRequestQueue';
import { PROFILE_REVIEW_ROLES } from '@/features/admin/profile-requests/types';

export const dynamic = 'force-dynamic';

export default async function ProfileRequestsPage() {
  const user = await getStaffUser([...PROFILE_REVIEW_ROLES]);
  if (!user) {
    redirect('/admin/login?callbackUrl=/admin/staff/profile-requests');
  }

  const tenantId = user.tenantId ?? 'platform';
  const requests = await getPendingProfileRequests(tenantId);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="anees-banner anees-banner-head">
        <p className="mb-1 small opacity-75">
          <Link href="/admin/staff" className="text-white text-decoration-underline">Staff</Link> · Public profiles
        </p>
        <h1 className="h5 mb-0">Public-profile requests ({requests.length})</h1>
      </div>

      <div className="card bg-white">
        <div className="card-body">
          <p className="text-muted small">
            Clinicians propose how they appear publicly; approve or reject each with an optional note. On approval, the
            bio, headline, and languages publish to the clinician&apos;s linked public profile (set the link in Staff).
            Photos are managed separately via the asset pipeline.
          </p>
          <ProfileRequestQueue requests={requests} />
        </div>
      </div>
    </div>
  );
}
