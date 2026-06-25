/** Client-safe form-state for the availability editor. Kept out of the
 *  `'use server'` actions module, which may only export async functions. */
export type AvailabilityFormState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

export const idleAvailabilityState: AvailabilityFormState = { status: 'idle', message: '' };
