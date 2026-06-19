import { redirect } from 'next/navigation';
import { getSessionUser, isStaff } from '@/lib/auth/rbac';
import { permissionsForRole } from '@/lib/auth/policy/ehr-matrix';

export const dynamic = 'force-dynamic';

/**
 * "My Access" — renders the signed-in role's effective permissions LIVE from the
 * role matrix (`policy/ehr-matrix.ts`), the same source the app uses to gate
 * every screen and action. Makes the matrix visible + auditable (useful for the
 * compliance officer and for any staff member to understand their own access).
 */
function levelBadge(level: string): string {
  if (level === 'sign') return 'bg-success';
  if (level === 'write') return 'bg-primary';
  return 'bg-secondary';
}

export default async function AdminAccessPage() {
  const user = await getSessionUser();

  if (!isStaff(user)) {
    redirect('/admin/login?callbackUrl=/admin/access');
  }

  const role = user.staffRole;
  const permissions = role ? permissionsForRole(role) : [];

  return (
    <div>
      <div className="anees-banner anees-banner-head mb-3">
        <p className="mb-1 small opacity-75">Anees EHR · Access &amp; Permissions</p>
        <h1 className="h5 mb-0">Your effective access · {role ?? 'no role'}</h1>
      </div>

      <div className="card bg-white">
        <div className="card-body">
          <p className="text-muted small">
            Derived live from the role matrix (<code>policy/ehr-matrix.ts</code>) — the single source of truth that
            gates every screen and server action. {permissions.length} module(s) accessible. Capabilities still
            require a valid licence + case-scope at submit time where the module demands it.
          </p>

          {permissions.length === 0 ? (
            <div className="alert alert-info mb-0" role="alert">This role has no module access in the matrix.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead><tr><th>Module</th><th>Access</th><th>Scope</th><th>Note</th></tr></thead>
                <tbody>
                  {permissions.map((permission) => (
                    <tr key={permission.module}>
                      <td className="fw-semibold">{permission.title}</td>
                      <td><span className={`badge ${levelBadge(permission.level)} text-capitalize`}>{permission.level}</span></td>
                      <td className="text-capitalize">{permission.scope}</td>
                      <td className="text-muted small">{permission.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
