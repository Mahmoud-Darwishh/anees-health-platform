/** Client-safe action state for the dispatch board. */
export type OpsActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

export const idleOpsActionState: OpsActionState = { status: 'idle', message: '' };

/** Roles that may run the case-manager dispatch board (mirrors /admin/ops route gate). */
export const DISPATCH_ROLES = ['superadmin', 'admin', 'medical_ops', 'operator'] as const;
