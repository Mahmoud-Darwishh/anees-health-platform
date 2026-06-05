import { redirect } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';
import { ClinicianBottomNav } from './ui/ClinicianBottomNav';
import { ClinicianTopbarActions } from './ui/ClinicianTopbarActions';
import './clinician-shell.scss';

export const dynamic = 'force-dynamic';

export default async function ClinicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getStaffUser(['physiotherapist', 'admin', 'superadmin']);

  if (!user) {
    redirect('/admin/patients');
  }

  const staffName = user.name ?? user.email ?? 'Clinician';

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
