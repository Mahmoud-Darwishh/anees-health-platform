import { redirect } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

export default async function AdminClinicianWorkspacePage() {
  const user = await getStaffUser([
    'superadmin',
    'admin',
    'doctor',
    'physiotherapist',
    'nurse',
    'medical_ops',
    'operator',
  ]);

  if (!user) {
    redirect('/admin/patients');
  }

  redirect('/clinician/today');
}
