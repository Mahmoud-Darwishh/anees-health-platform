import { redirect } from 'next/navigation';
import { staffCan } from '@/lib/auth/policy/enforce';

export const dynamic = 'force-dynamic';

/**
 * Discipline dispatcher for the field-clinician workspace. Physio (and admins,
 * who hold physio access) land on the physio journey; a nurse who only holds
 * nursing-workspace access lands on the nurse journey.
 */
export default async function ClinicianRootPage() {
  if (await staffCan('workspace.physio.access')) {
    redirect('/clinician/today');
  }
  if (await staffCan('workspace.nursing.access')) {
    redirect('/clinician/nursing/today');
  }
  if (await staffCan('workspace.doctor.access')) {
    redirect('/clinician/doctor');
  }
  redirect('/admin');
}
