/** Client-safe form-state for the nurse session documentation forms. */
export type NurseFormState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

export const idleNurseFormState: NurseFormState = { status: 'idle', message: '' };
