'use client';

import { useActionState } from 'react';
import { confirmInstapayPaymentAction, rejectInstapayPaymentAction } from './actions';
import { idleBillingActionState } from './types';
import type { PendingPaymentItem } from './data';

const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function PendingPaymentRow({ item }: { item: PendingPaymentItem }) {
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmInstapayPaymentAction, idleBillingActionState);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectInstapayPaymentAction, idleBillingActionState);

  const resolved = confirmState.status === 'success' || rejectState.status === 'success';
  const message =
    confirmState.status !== 'idle' ? confirmState : rejectState.status !== 'idle' ? rejectState : null;

  return (
    <tr className={resolved ? 'table-light text-muted' : undefined}>
      <td>
        <div className="fw-semibold">{item.fullName}</div>
        <div className="small text-muted" dir="ltr">{item.phone}</div>
        <div className="small text-muted">{item.bookingRef}</div>
      </td>
      <td className="text-nowrap">{item.amountEgp.toLocaleString('en-US')} {item.currency}</td>
      <td className="small">
        {item.instapayReference ? <div dir="ltr">Ref: {item.instapayReference}</div> : <span className="text-muted">no reference</span>}
        {item.instapaySenderName ? <div>{item.instapaySenderName}</div> : null}
      </td>
      <td className="small text-capitalize">{item.governorate ?? '—'}</td>
      <td className="small text-nowrap">{dateTimeFmt.format(new Date(item.createdAtIso))}</td>
      <td className="text-end" style={{ minWidth: '14rem' }}>
        {resolved ? (
          <span className={`small ${message?.status === 'error' ? 'text-danger' : 'text-success'}`}>{message?.message}</span>
        ) : (
          <div className="d-flex gap-2 justify-content-end flex-wrap">
            <form action={confirmAction}>
              <input type="hidden" name="bookingRef" value={item.bookingRef} />
              <button type="submit" className="btn btn-sm btn-success" disabled={confirmPending || rejectPending}>
                {confirmPending ? 'Confirming…' : 'Confirm received'}
              </button>
            </form>
            <form action={rejectAction}>
              <input type="hidden" name="bookingRef" value={item.bookingRef} />
              <button type="submit" className="btn btn-sm btn-outline-danger" disabled={confirmPending || rejectPending}>
                Not received
              </button>
            </form>
          </div>
        )}
        {!resolved && message?.status === 'error' ? (
          <div className="small text-danger mt-1">{message.message}</div>
        ) : null}
      </td>
    </tr>
  );
}

export function BillingQueueView({ items }: { items: PendingPaymentItem[] }) {
  if (items.length === 0) {
    return <div className="alert alert-light border mb-0">No InstaPay transfers awaiting confirmation.</div>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>Patient</th>
            <th>Amount</th>
            <th>Transfer</th>
            <th>Area</th>
            <th>Submitted</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <PendingPaymentRow key={item.bookingRef} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
