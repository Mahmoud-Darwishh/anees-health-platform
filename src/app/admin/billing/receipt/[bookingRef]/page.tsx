import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getStaffUser } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';
import { PAYMENT_CONFIRM_ROLES } from '@/features/admin/billing/types';
import { PrintButton } from '@/features/admin/billing/PrintButton';

export const dynamic = 'force-dynamic';

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function methodLabel(method: string | null): string {
  if (method === 'instapay') return 'InstaPay / Bank Transfer';
  if (method === 'card') return 'Credit / Debit Card';
  return 'Card';
}

type Props = { params: Promise<{ bookingRef: string }> };

export default async function ReceiptPage({ params }: Props) {
  const { bookingRef } = await params;
  const user = await getStaffUser([...PAYMENT_CONFIRM_ROLES]);
  if (!user) {
    redirect(`/admin/login?callbackUrl=/admin/billing/receipt/${bookingRef}`);
  }

  const booking = await prisma.onlineBooking.findUnique({
    where: { bookingRef },
    select: {
      bookingRef: true,
      fullName: true,
      countryCode: true,
      phoneNumber: true,
      amountEgp: true,
      discountEgp: true,
      currency: true,
      status: true,
      paymentMethod: true,
      instapayReference: true,
      kashierTransactionId: true,
      paymentCompletedAt: true,
      paymentConfirmedAt: true,
      visitType: true,
      packageType: true,
      tenantId: true,
    },
  });

  if (!booking || booking.tenantId !== (user.tenantId ?? 'platform')) {
    notFound();
  }

  const patient = await prisma.patient.findFirst({
    // Tenant-scoped: resolve the patient within the (already tenant-verified) booking's tenant.
    where: { phone: `${booking.countryCode}${booking.phoneNumber}`, tenantId: booking.tenantId },
    orderBy: { createdAt: 'desc' },
    select: { code: true },
  });

  const paidAt = booking.paymentCompletedAt ?? booking.paymentConfirmedAt;
  const isPaid = booking.status === 'payment_completed';
  const reference = booking.instapayReference ?? booking.kashierTransactionId ?? booking.bookingRef;

  return (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex justify-content-between align-items-center d-print-none">
        <Link href="/admin/billing" className="btn btn-sm btn-link px-0">← Back to billing</Link>
        <PrintButton label="Print / Save PDF" />
      </div>

      {!isPaid ? (
        <div className="alert alert-warning">This booking is not marked as paid yet — a receipt is only final once payment is confirmed.</div>
      ) : null}

      <div className="card bg-white mx-auto" style={{ maxWidth: '40rem', width: '100%' }}>
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start mb-4">
            <div>
              <h1 className="h5 mb-0">Anees Health</h1>
              <p className="text-muted small mb-0">Payment Receipt</p>
            </div>
            <div className="text-end small text-muted">
              <div>Receipt: {booking.bookingRef}</div>
              {paidAt ? <div>{dateFmt.format(paidAt)}</div> : null}
            </div>
          </div>

          <dl className="row mb-0">
            <dt className="col-5 text-muted small">Patient</dt>
            <dd className="col-7">{booking.fullName}{patient?.code ? ` · ${patient.code}` : ''}</dd>

            <dt className="col-5 text-muted small">Service</dt>
            <dd className="col-7 text-capitalize">{booking.packageType ?? booking.visitType}</dd>

            <dt className="col-5 text-muted small">Payment method</dt>
            <dd className="col-7">{methodLabel(booking.paymentMethod)}</dd>

            <dt className="col-5 text-muted small">Reference</dt>
            <dd className="col-7" style={{ wordBreak: 'break-all' }}>{reference}</dd>

            {Number(booking.discountEgp) > 0 ? (
              <>
                <dt className="col-5 text-muted small">Discount</dt>
                <dd className="col-7">{Number(booking.discountEgp).toLocaleString('en-US')} {booking.currency}</dd>
              </>
            ) : null}

            <dt className="col-5 fw-semibold">Amount paid</dt>
            <dd className="col-7 fw-semibold">{Number(booking.amountEgp).toLocaleString('en-US')} {booking.currency}</dd>

            <dt className="col-5 text-muted small">Status</dt>
            <dd className="col-7 text-capitalize">{isPaid ? 'Paid' : booking.status.replace(/_/g, ' ')}</dd>
          </dl>

          <hr />
          <p className="text-muted small mb-0">
            Thank you for choosing Anees Health. This is a computer-generated receipt for a prepaid home-care booking.
          </p>
        </div>
      </div>
    </div>
  );
}
