import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getStaffUser } from '@/lib/auth/rbac';
import { rolesForRoute } from '@/lib/auth/route-access';
import { getDispatchBoardData, getSchedulingCatalog } from '@/features/admin/ops/data';
import { DispatchBoardView } from '@/features/admin/ops/DispatchBoardView';
import { CreateVisitForm } from '@/features/admin/ops/CreateVisitForm';

export const dynamic = 'force-dynamic';

export default async function AdminOpsWorkspacePage() {
  const user = await getStaffUser(rolesForRoute('/admin/ops'));
  if (!user) {
    redirect('/admin/patients');
  }

  const tenantId = user.tenantId ?? 'platform';
  const [board, catalog] = await Promise.all([
    getDispatchBoardData(tenantId),
    getSchedulingCatalog(),
  ]);

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

      <details className="card">
        <summary className="card-header fw-semibold" style={{ cursor: 'pointer', listStyle: 'revert' }}>
          Schedule a new visit
        </summary>
        <div className="card-body">
          <CreateVisitForm services={catalog.services} clinicians={board.clinicians} />
        </div>
      </details>

      <DispatchBoardView data={board} />
    </div>
  );
}
