import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { getClinicianPhysioProfileData } from '@/lib/ehr/clinician-physio-profile';
import { ProfilePageView } from '@/features/ehr/clinician-physio/profile/ProfilePageView';
import { PublicProfileEditor } from '@/features/admin/profile-requests/PublicProfileEditor';
import { getMyLatestProfileRequest } from '@/features/admin/profile-requests/data';

export const dynamic = 'force-dynamic';

export default async function ClinicianProfilePage() {
  const { user } = await requireStaffCan('workspace.physio.access');
  const [data, latestProfileRequest] = await Promise.all([
    getClinicianPhysioProfileData(),
    getMyLatestProfileRequest(user.staffId),
  ]);

  return (
    <>
      <ProfilePageView data={data} />
      <section className="clinician-surface mt-3">
        <PublicProfileEditor latest={latestProfileRequest} />
      </section>
    </>
  );
}
