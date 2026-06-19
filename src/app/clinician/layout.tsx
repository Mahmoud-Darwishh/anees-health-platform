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
  // Route gate, discipline-aware: derived from the permission matrix, not a
  // hard-coded list. Physio and nurse each have a workspace here; admins hold
  // both. Anyone with neither is bounced to the `/admin` dispatcher.
  const user = await getSessionUser();

  const canPhysio = await staffCan('workspace.physio.access');
  const canNursing = !canPhysio && (await staffCan('workspace.nursing.access'));
  const canDoctor = !canPhysio && !canNursing && (await staffCan('workspace.doctor.access'));

  if (!canPhysio && !canNursing && !canDoctor) {
    redirect('/admin');
  }

  const discipline: 'physio' | 'nursing' | 'doctor' = canPhysio ? 'physio' : canNursing ? 'nursing' : 'doctor';
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
      <ClinicianBottomNav discipline={discipline} />
    </div>
  );
}
