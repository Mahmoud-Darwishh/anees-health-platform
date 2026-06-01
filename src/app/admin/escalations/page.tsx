import { AdminEscalationsPageView } from '@/features/ehr/admin-escalations/page-view';
import { consumeAdminEscalationsFlash } from '@/features/ehr/admin-escalations/flash';
import { loadAdminEscalationsData } from '@/features/ehr/admin-escalations/data';

export const dynamic = 'force-dynamic';

export default async function AdminEscalationsPage() {
  const [data, flash] = await Promise.all([
    loadAdminEscalationsData(),
    consumeAdminEscalationsFlash(),
  ]);

  return <AdminEscalationsPageView data={data} flash={flash} />;
}
