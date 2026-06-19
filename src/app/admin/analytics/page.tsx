import { redirect } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';
import { rolesForRoute } from '@/lib/auth/route-access';
import { getOwnerAnalytics } from '@/features/admin/analytics/data';
import { AnalyticsView } from '@/features/admin/analytics/AnalyticsView';

export const dynamic = 'force-dynamic';

export default async function AdminAnalyticsPage() {
  const user = await getStaffUser(rolesForRoute('/admin/analytics'));
  if (!user) {
    redirect('/admin/login?callbackUrl=/admin/analytics');
  }

  const tenantId = user.tenantId ?? 'platform';
  const analytics = await getOwnerAnalytics(tenantId);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="anees-banner anees-banner-head">
        <p className="mb-1 small opacity-75">Anees · Business</p>
        <h1 className="h5 mb-0">Analytics &amp; KPIs</h1>
      </div>
      <AnalyticsView data={analytics} />
    </div>
  );
}
