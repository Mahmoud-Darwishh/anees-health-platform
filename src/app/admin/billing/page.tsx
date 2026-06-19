import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';
import { getPendingInstapayPayments, getRecentRefunds } from '@/features/admin/billing/data';
import { BillingQueueView } from '@/features/admin/billing/BillingQueueView';
import { RefundsView } from '@/features/admin/billing/RefundsView';
import { PAYMENT_CONFIRM_ROLES } from '@/features/admin/billing/types';

export const dynamic = 'force-dynamic';

export default async function AdminBillingPage() {
  const user = await getStaffUser([...PAYMENT_CONFIRM_ROLES]);
  if (!user) {
    redirect('/admin/login?callbackUrl=/admin/billing');
  }

  const tenantId = user.tenantId ?? 'platform';
  const [pending, refunds] = await Promise.all([
    getPendingInstapayPayments(tenantId),
    getRecentRefunds(tenantId),
  ]);

  return (
    <div className="d-flex flex-column gap-4">
      <div className="anees-banner anees-banner-head">
        <p className="mb-1 small opacity-75">Anees · Billing</p>
        <h1 className="h5 mb-0">Payments &amp; reconciliation</h1>
      </div>

      <div className="card bg-white">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
            <h2 className="h6 mb-0">InstaPay — awaiting confirmation ({pending.length})</h2>
            <Link href="/admin/billing/export" className="btn btn-sm btn-outline-secondary" prefetch={false}>
              Export delivered visits (CSV)
            </Link>
          </div>
          <p className="text-muted small">
            Match each transfer against your bank/InstaPay statement, then confirm. Confirming marks the booking paid,
            records the payment, and sends the patient their portal-claim invite. Either operations or finance may confirm.
          </p>
          <BillingQueueView items={pending} />
        </div>
      </div>

      <div className="card bg-white">
        <div className="card-body">
          <h2 className="h6">Refunds</h2>
          <p className="text-muted small">
            Record a refund for a paid booking — the amount follows the cancellation policy. Money is returned manually
            (Kashier refund or InstaPay reverse transfer); mark each refund sent once the money has actually gone out.
          </p>
          <RefundsView refunds={refunds} />
        </div>
      </div>
    </div>
  );
}
