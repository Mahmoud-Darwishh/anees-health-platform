/** Client-safe action state for the billing (payments) screen forms. */
export type BillingActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

export const idleBillingActionState: BillingActionState = { status: 'idle', message: '' };

/** Roles allowed to confirm/reject InstaPay transfers (owner decision: ops OR finance). */
export const PAYMENT_CONFIRM_ROLES = ['superadmin', 'admin', 'finance', 'medical_ops', 'operator'] as const;
