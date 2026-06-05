import { redirect } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminOpsWorkspacePage() {
  const user = await getStaffUser([
    'superadmin',
    'admin',
    'medical_ops',
    'operator',
  ]);

  if (!user) {
    redirect('/admin/patients');
  }

  return (
    <div className="card bg-white">
      <div className="card-header">
        <h1 className="h5 mb-0">Medical Operations Workspace</h1>
      </div>
      <div className="card-body">
        <p className="mb-2">
          This route is reserved for live dispatch, shift oversight, and operations queues.
        </p>
        <p className="text-muted mb-3">
          Next implementation slice: live map board with visit status lanes and reassignment actions.
        </p>
        <Link href="/admin/ops/disputes" className="btn btn-sm btn-outline-primary">
          Open dispute and disruption queue
        </Link>
      </div>
    </div>
  );
}
