import { loadNurseDashboardData } from '@/features/ehr/admin-nursing-dashboard/data';
import { AdminNursingDashboardView } from '@/features/ehr/admin-nursing-dashboard/page-view';

export default async function AdminNursingDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; startDate?: string; endDate?: string }>;
}) {
  const { period, startDate, endDate } = await searchParams;
  const data = await loadNurseDashboardData({ period, startDate, endDate });
  return <AdminNursingDashboardView data={data} />;
}
