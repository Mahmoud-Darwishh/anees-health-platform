import { redirect } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';
import { rolesForRoute } from '@/lib/auth/route-access';

export const dynamic = 'force-dynamic';

export default async function AdminClinicianWorkspacePage() {
  const user = await getStaffUser(rolesForRoute('/admin/clinician'));

  if (!user) {
    redirect('/admin');
  }

  redirect('/clinician/today');
}
