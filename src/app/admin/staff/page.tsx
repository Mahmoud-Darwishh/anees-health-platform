import { redirect } from 'next/navigation';
import { ButtonLink, Card, EmptyState, StatusPill, TableShell } from '@/components/ui';
import { getStaffUser } from '@/lib/auth/rbac';
import { listStaff, listDoctorOptions } from '@/features/admin/staff/data';
import { createStaffAction } from '@/features/admin/staff/actions';
import { StaffForm } from '@/features/admin/staff/StaffForm';
import { ROLE_LABELS, STATUS_LABELS } from '@/features/admin/staff/labels';

export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

function statusTone(status: string): 'success' | 'danger' | 'neutral' {
  if (status === 'active') return 'success';
  if (status === 'suspended') return 'danger';
  return 'neutral';
}

function licenceCell(expiry: Date | null, type: string | null): { text: string; className: string } {
  if (!type || type === 'none') return { text: '-', className: 'text-muted' };
  if (!expiry) return { text: 'no expiry set', className: 'text-warning-emphasis' };
  const now = Date.now();
  const ms = expiry.getTime() - now;
  if (ms < 0) return { text: `expired ${dateFmt.format(expiry)}`, className: 'text-danger fw-semibold' };
  const days = ms / (24 * 60 * 60 * 1000);
  if (days < 30) return { text: `expires ${dateFmt.format(expiry)}`, className: 'text-warning-emphasis fw-semibold' };
  return { text: dateFmt.format(expiry), className: 'text-muted' };
}

export default async function AdminStaffPage() {
  const user = await getStaffUser(['superadmin', 'admin']);
  if (!user) {
    redirect('/admin/login?callbackUrl=/admin/staff');
  }

  const tenantId = user.tenantId ?? 'platform';
  const [staff, doctorOptions] = await Promise.all([listStaff(tenantId), listDoctorOptions()]);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="anees-banner anees-banner-head">
        <p className="mb-1 small opacity-75">Anees EHR - Governance</p>
        <h1 className="h5 mb-0">Staff &amp; access</h1>
      </div>

      <TableShell
        experience="ops"
        title={`Team (${staff.length})`}
        description="Every clinical role needs a valid, discipline-matching licence before it can sign records. New accounts receive a one-time link to set their own password."
        actions={
          <ButtonLink href="/admin/staff/profile-requests" size="sm" variant="outline" experience="ops">
            Public-profile requests
          </ButtonLink>
        }
      >
        {staff.length === 0 ? (
          <EmptyState experience="ops" compact title="No staff yet" description="Create the first account below." />
        ) : (
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Licence</th>
                <th>Account</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => {
                const licence = licenceCell(member.clinicalLicenseExpiry, member.clinicalLicenseType);
                return (
                  <tr key={member.id}>
                    <td>
                      <div className="fw-semibold">{member.name}</div>
                      <div className="text-muted small">{member.email}</div>
                    </td>
                    <td>{ROLE_LABELS[member.role]}</td>
                    <td>
                      <StatusPill tone={statusTone(member.status)}>{STATUS_LABELS[member.status]}</StatusPill>
                    </td>
                    <td className={`small ${licence.className}`}>{licence.text}</td>
                    <td className="small">
                      {member.hasSignedIn ? <span className="text-success">Claimed</span> : <span className="text-muted">Invite pending</span>}
                      {!member.providerLinked ? (
                        <div className="text-warning-emphasis" title="Not yet assignable on the dispatch board - open and save to link a provider">
                          Provider link pending
                        </div>
                      ) : null}
                    </td>
                    <td className="text-end">
                      <ButtonLink href={`/admin/staff/${member.id}`} size="sm" variant="outline" experience="ops">
                        Manage
                      </ButtonLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </TableShell>

      <Card experience="ops" title="Add a staff member">
        <StaffForm mode="create" action={createStaffAction} doctorOptions={doctorOptions} />
      </Card>
    </div>
  );
}
