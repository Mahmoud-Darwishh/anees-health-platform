import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { prisma } from '@/lib/db/prisma';
import { StaffProfileCard } from '@/features/ehr/clinician-shared/StaffProfileCard';
import { PublicProfileEditor } from '@/features/admin/profile-requests/PublicProfileEditor';
import { getMyLatestProfileRequest } from '@/features/admin/profile-requests/data';
import { AvailabilityManager } from '@/features/ehr/clinician-shared/availability/AvailabilityManager';
import { canManageAvailability, getMyAvailability } from '@/features/ehr/clinician-shared/availability/data';

export const dynamic = 'force-dynamic';

export default async function NurseProfilePage() {
  const { user } = await requireStaffCan('workspace.nursing.access');
  const latestProfileRequest = await getMyLatestProfileRequest(user.staffId);
  const availability = canManageAvailability(user.staffRole) ? await getMyAvailability() : null;
  const staff = await prisma.staff.findUnique({
    where: { id: user.staffId },
    select: {
      name: true,
      email: true,
      role: true,
      clinicalLicenseType: true,
      clinicalLicenseNumber: true,
      clinicalLicenseExpiry: true,
      licenseIssuingBody: true,
      isOnCall: true,
      isClinicalDirector: true,
    },
  });

  return (
    <section className="clinician-surface">
      <header className="mb-3">
        <h2 className="h5 mb-1">My profile</h2>
        <p className="text-muted mb-0">Read-only. Ask an administrator to update your role or licence.</p>
      </header>

      <StaffProfileCard
        name={staff?.name ?? user.name ?? null}
        email={staff?.email ?? null}
        role={staff?.role ?? user.staffRole ?? null}
        licenseType={staff?.clinicalLicenseType ?? null}
        licenseNumber={staff?.clinicalLicenseNumber ?? null}
        licenseExpiry={staff?.clinicalLicenseExpiry ?? null}
        issuingBody={staff?.licenseIssuingBody ?? null}
        isOnCall={staff?.isOnCall ?? false}
        isClinicalDirector={staff?.isClinicalDirector ?? false}
      />

      <PublicProfileEditor latest={latestProfileRequest} />

      {availability ? <AvailabilityManager availability={availability} /> : null}
    </section>
  );
}
