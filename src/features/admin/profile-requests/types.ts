/** Client-safe action state for the profile-change-request forms. */
export type ProfileActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

export const idleProfileActionState: ProfileActionState = { status: 'idle', message: '' };

/** Roles that may submit their own public-profile change request. */
export const PROFILE_SUBMIT_ROLES = ['doctor', 'nurse', 'physiotherapist', 'admin', 'superadmin'] as const;

/** Roles that may approve/reject public-profile change requests. */
export const PROFILE_REVIEW_ROLES = ['superadmin', 'admin'] as const;
