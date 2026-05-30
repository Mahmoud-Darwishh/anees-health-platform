import { AdminPatientDetailView } from '@/features/ehr/admin-patient/page-view';
import { consumeAdminPatientFlash } from '@/features/ehr/admin-patient/flash';
import { loadAdminPatientDetailData } from '@/features/ehr/admin-patient/data';

export const dynamic = 'force-dynamic';

export default async function AdminPatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const [data, flash] = await Promise.all([
    loadAdminPatientDetailData(id),
    consumeAdminPatientFlash(),
  ]);

  return <AdminPatientDetailView data={data} flash={flash} activeTab={tab} />;
}
