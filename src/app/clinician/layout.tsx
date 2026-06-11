import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/rbac';
import { staffCan } from '@/lib/auth/policy/enforce';
import { ClinicianBottomNav } from './ui/ClinicianBottomNav';
import { ClinicianTopbarActions } from './ui/ClinicianTopbarActions';
import './clinician-shell.scss';

export const dynamic = 'force-dynamic';

export default async function ClinicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Route gate: derives the allowed roles from the permission matrix, not a
  // hard-coded list. A non-physio staff member is bounced to the `/admin`
  // dispatcher, which sends them to their own home section.
  const user = await getSessionUser();

  if (!(await staffCan('workspace.physio.access'))) {
    redirect('/admin');
  }

  const staffName = user?.name ?? user?.email ?? 'Clinician';

  return (
    <div className="clinician-shell">
      <header className="clinician-topbar">
        <div className="clinician-topbar-copy">
          <p className="clinician-topbar-subtitle mb-1">Clinician workspace</p>
          <h1 className="clinician-topbar-title mb-0">Good day, {staffName}</h1>
        </div>
        <ClinicianTopbarActions />
      </header>

      <main className="clinician-main">{children}</main>
      <ClinicianBottomNav />
    </div>
  );
}
