/** Client-safe form-state for the doctor session documentation forms. */
export type DoctorFormState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

export const idleDoctorFormState: DoctorFormState = { status: 'idle', message: '' };
