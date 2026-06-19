import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStaffUser } from '@/lib/auth/rbac';
import { rolesForRoute } from '@/lib/auth/route-access';
import { getDispatchBoardData } from '@/features/admin/ops/data';
import { DispatchBoardView } from '@/features/admin/ops/DispatchBoardView';

export const dynamic = 'force-dynamic';

export default async function AdminOpsWorkspacePage() {
  const user = await getStaffUser(rolesForRoute('/admin/ops'));
  if (!user) {
    redirect('/admin/patients');
  }

  const tenantId = user.tenantId ?? 'platform';
  const board = await getDispatchBoardData(tenantId);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="anees-banner anees-banner-head">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <div>
            <p className="mb-1 small opacity-75">Anees · Medical Operations</p>
            <h1 className="h5 mb-0">Dispatch &amp; scheduling</h1>
          </div>
          <Link href="/admin/ops/disputes" className="btn btn-sm btn-outline-light">Disputes &amp; disruptions</Link>
        </div>
      </div>

      <DispatchBoardView data={board} />
    </div>
  );
}
