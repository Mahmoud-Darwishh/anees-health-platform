import type { StaffRole } from '@prisma/client';
import type { EscalationTaskSummary } from '@/lib/medplum/tasks';

export type AdminEscalationsFlash = {
  type: 'success' | 'error';
  message: string;
};

export type EscalationQueueItem = EscalationTaskSummary & {
  patientName: string;
  patientCode: string | null;
  isOverdue: boolean;
};

export type AdminEscalationsData = {
  error: string | null;
  items: EscalationQueueItem[];
  myItems: EscalationQueueItem[];
  unassignedItems: EscalationQueueItem[];
  myReference: string | null;
  staffName: string;
  staffRole: StaffRole | null;
};
