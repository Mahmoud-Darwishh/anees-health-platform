/**
 * Shared inline-feedback state for the physiotherapist field forms.
 *
 * Lives in a plain module (not the `'use server'` actions file, which may only
 * export async functions) so both the server actions and the client
 * `useActionState` forms can import the type + initial value.
 */
export type ClinicianActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

export const CLINICIAN_ACTION_INITIAL_STATE: ClinicianActionState = { status: 'idle' };
