import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser, isStaff } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

/**
 * Role-aware landing for staff whose workspace is intentionally not built yet,
 * per the role matrix (docs/EHR_ROLE_MATRIX.md §1): `viewer` (aggregate KPIs,
 * no PHI) and `hospital_partner_admin` (schema-only; multi-tenant portal lands in
 * the tenant phase). It keeps them inside the staff shell with a clear,
 * role-specific message instead of dumping them on the public site.
 */
function roleStatus(staffRole: string | null | undefined): { title: string; body: string } {
  switch (staffRole) {
    case 'viewer':
      return {
        title: 'Viewer access — aggregate KPIs only',
        body:
          'Your role is read-only and explicitly carries NO access to patient-identifying data (PHI), per the role matrix. The aggregate KPI dashboard for viewers is on the roadmap; until it ships there is no section to show.',
      };
    case 'hospital_partner_admin':
      return {
        title: 'Hospital-partner workspace — coming with multi-tenancy',
        body:
          'Your role is provisioned in the system, but the scoped hospital-partner portal is built in the multi-tenancy phase (see CTO_STRATEGY Phase 1). There is no section to show yet.',
      };
    default:
      return {
        title: 'No workspace assigned yet',
        body:
          'Your account is active, but there is no console section available for this role at the moment. If you believe this is a mistake, please contact your platform administrator.',
      };
  }
}

export default async function AdminNoWorkspacePage() {
  const user = await getSessionUser();

  if (!isStaff(user)) {
    redirect('/en/auth/login?callbackUrl=/admin');
  }

  const status = roleStatus(user.staffRole);

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <div className="text-center">
        <h1 className="h3 mb-3">{status.title}</h1>
        <p className="text-muted mb-1">Signed in as <strong>{user.name ?? user.email}</strong> ({user.staffRole}).</p>
        <p className="text-muted mb-4">{status.body}</p>
        <Link href="/en" className="btn btn-outline-secondary">
          Back to Anees Health
        </Link>
      </div>
    </div>
  );
}
