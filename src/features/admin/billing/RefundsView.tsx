'use client';

import { useActionState } from 'react';
import { recordRefundAction, completeRefundAction } from './actions';
import { idleBillingActionState } from './types';
import type { RefundListItem } from './data';

const REASON_OPTIONS: { value: string; label: string }[] = [
  { value: 'patient_late_cancel', label: 'Patient late cancellation' },
  { value: 'med_ops_reassignment', label: 'Ops reassignment / our fault' },
  { value: 'unsafe_environment', label: 'Unsafe environment' },
  { value: 'patient_no_show', label: 'Patient no-show' },
  { value: 'patient_refused_care', label: 'Patient refused care' },
  { value: 'other', label: 'Other' },
];

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

function RecordRefundForm() {
  const [state, action, pending] = useActionState(recordRefundAction, idleBillingActionState);
  return (
    <form action={action} className="row g-2 align-items-end">
      <div className="col-12 col-md-4">
        <label htmlFor="refund-bookingRef" className="form-label small mb-1">Booking reference</label>
        <input id="refund-bookingRef" name="bookingRef" className="form-control form-control-sm" required dir="ltr" />
      </div>
      <div className="col-7 col-md-4">
        <label htmlFor="refund-reason" className="form-label small mb-1">Reason</label>
        <select id="refund-reason" name="reasonCode" className="form-select form-select-sm" defaultValue="patient_late_cancel">
          {REASON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="col-5 col-md-2">
        <button type="submit" className="btn btn-sm btn-outline-primary w-100" disabled={pending}>
          {pending ? 'Recording…' : 'Record refund'}
        </button>
      </div>
      <div className="col-12 col-md-2">
        <input name="reasonNote" className="form-control form-control-sm" placeholder="Note (optional)" dir="auto" />
      </div>
      {state.status === 'error' ? <div className="col-12"><p className="text-danger small mb-0">{state.message}</p></div> : null}
      {state.status === 'success' ? <div className="col-12"><p className="text-success small mb-0">{state.message}</p></div> : null}
    </form>
  );
}

function CompleteRefundButton({ refundId }: { refundId: string }) {
  const [state, action, pending] = useActionState(completeRefundAction, idleBillingActionState);
  if (state.status === 'success') {
    return <span className="text-success small">Completed</span>;
  }
  return (
    <form action={action}>
      <input type="hidden" name="refundId" value={refundId} />
      <button type="submit" className="btn btn-sm btn-outline-success" disabled={pending}>
        {pending ? '…' : 'Mark sent'}
      </button>
      {state.status === 'error' ? <div className="small text-danger mt-1">{state.message}</div> : null}
    </form>
  );
}

export function RefundsView({ refunds }: { refunds: RefundListItem[] }) {
  return (
    <div className="d-flex flex-column gap-3">
      <RecordRefundForm />

      {refunds.length === 0 ? (
        <div className="alert alert-light border mb-0">No refunds recorded.</div>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-0">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Refund</th>
                <th>Fee</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Recorded</th>
                <th aria-label="Action" />
              </tr>
            </thead>
            <tbody>
              {refunds.map((r) => (
                <tr key={r.id}>
                  <td className="small" dir="ltr">{r.bookingRef}</td>
                  <td className="text-nowrap">{r.refundEgp.toLocaleString('en-US')} EGP</td>
                  <td className="text-nowrap small text-muted">{r.feeEgp.toLocaleString('en-US')} EGP</td>
                  <td className="small text-capitalize">{r.reasonCode.replace(/_/g, ' ')}</td>
                  <td>
                    <span className={`badge ${r.status === 'completed' ? 'bg-success' : 'bg-warning text-dark'}`}>{r.status}</span>
                  </td>
                  <td className="small text-nowrap">{dateFmt.format(new Date(r.createdAtIso))}</td>
                  <td className="text-end">{r.status === 'pending' ? <CompleteRefundButton refundId={r.id} /> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
