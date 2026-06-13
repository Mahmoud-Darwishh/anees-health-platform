import type { StaffRole } from '@prisma/client';

export const MAX_DOCUMENT_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MiB
export const NURSING_HANDOFF_DEFAULT_RADIUS_METERS = 500;
export const NURSING_HANDOFF_MAX_ACCURACY_METERS = 150;
export const VISIT_GEOFENCE_DEFAULT_RADIUS_METERS = 150;
export const VISIT_GEOFENCE_MAX_ACCURACY_METERS = 150;
export const VISIT_CHECKOUT_MIN_DURATION_MINUTES = 5;
export const VISIT_CHECKOUT_DISTANCE_REVIEW_METERS = 500;
export const LATE_CHECKIN_THRESHOLD_MINUTES = 15;
export const NOTE_COSIGN_SLA_HOURS = 24;
export const COSIGN_SLA_BREACH_MARKER = '[co-sign-sla-breach]';
export const LATE_CHECKIN_TASK_MARKER = '[late-checkin]';
export const VISIT_REVIEW_TASK_MARKER = '[visit-review]';
export const PHYSIO_DISCHARGE_REVIEW_MARKER = '[physio-discharge-review]';
export const RESTRICTED_OVERRIDE_WEEKLY_THRESHOLD = 5;
export const RESTRICTED_OVERRIDE_COMPLIANCE_MARKER = '[restricted-override-threshold]';
export const DOCUMENT_DELETE_APPROVAL_TTL_MINUTES = 30;

export const NURSING_SHIFT_WRITE_ROLES: StaffRole[] = ['superadmin', 'admin', 'nurse'];
