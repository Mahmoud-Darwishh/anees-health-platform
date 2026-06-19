import type { StaffRole } from '@prisma/client';

/**
 * Presentational, read-only clinician profile card. Shared by every discipline
 * workspace (physio / nurse / doctor) so the "My profile" screen is identical —
 * staff edit their role + licence only via an administrator (Staff Management).
 */

export type StaffProfileCardProps = {
  name: string | null;
  email: string | null;
  role: StaffRole | null;
  licenseType: string | null;
  licenseNumber: string | null;
  licenseExpiry: Date | null;
  issuingBody: string | null;
  isOnCall: boolean;
  isClinicalDirector: boolean;
};

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

function licenceStatus(expiry: Date | null): { text: string; className: string } {
  if (!expiry) return { text: 'No expiry on file', className: 'text-warning-emphasis' };
  const ms = expiry.getTime() - Date.now();
  if (ms < 0) return { text: `Expired ${dateFmt.format(expiry)}`, className: 'text-danger fw-semibold' };
  if (ms < 30 * 24 * 60 * 60 * 1000) return { text: `Expires ${dateFmt.format(expiry)}`, className: 'text-warning-emphasis fw-semibold' };
  return { text: `Valid to ${dateFmt.format(expiry)}`, className: 'text-success' };
}

export function StaffProfileCard(props: StaffProfileCardProps) {
  const licence = licenceStatus(props.licenseExpiry);

  return (
    <div className="clinician-visit-card">
      <dl className="row mb-0 small">
        <dt className="col-5 text-muted">Name</dt>
        <dd className="col-7">{props.name ?? '—'}</dd>

        <dt className="col-5 text-muted">Email</dt>
        <dd className="col-7">{props.email ?? '—'}</dd>

        <dt className="col-5 text-muted">Role</dt>
        <dd className="col-7 text-capitalize">{props.role ?? '—'}</dd>

        <dt className="col-5 text-muted">Licence type</dt>
        <dd className="col-7">{props.licenseType ? props.licenseType.replace(/_/g, ' ') : '—'}</dd>

        <dt className="col-5 text-muted">Licence number</dt>
        <dd className="col-7">{props.licenseNumber ?? '—'}</dd>

        <dt className="col-5 text-muted">Licence status</dt>
        <dd className={`col-7 ${licence.className}`}>{licence.text}</dd>

        <dt className="col-5 text-muted">Issuing body</dt>
        <dd className="col-7">{props.issuingBody ?? '—'}</dd>

        <dt className="col-5 text-muted">On-call</dt>
        <dd className="col-7">{props.isOnCall ? 'Yes' : 'No'}</dd>

        <dt className="col-5 text-muted">Clinical director</dt>
        <dd className="col-7">{props.isClinicalDirector ? 'Yes' : 'No'}</dd>
      </dl>
    </div>
  );
}
