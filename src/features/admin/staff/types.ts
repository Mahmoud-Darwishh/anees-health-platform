/**
 * Shared shapes for the staff-management feature. Safe to import on the client
 * (no server-only deps) so the form components can type their `useActionState`.
 */

export type StaffActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  /**
   * Present only after a successful create / reissue: the ONE-TIME set-password
   * link to hand to the staff member out-of-band. Never persisted, never logged.
   */
  inviteUrl?: string | null;
};

export const idleStaffActionState: StaffActionState = { status: 'idle', message: '' };
