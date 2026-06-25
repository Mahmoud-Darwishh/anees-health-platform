import 'server-only';

import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { prisma } from '@/lib/db/prisma';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { listTasksByOwner, type MedplumTaskResource } from '@/lib/medplum/tasks';

type TaskStatus = MedplumTaskResource['status'];

export type NurseTaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: MedplumTaskResource['priority'] | null;
  patientReference: string | null;
  dueAtIso: string | null;
  lastUpdatedIso: string | null;
};

export type NurseTasksData = {
  warning: string | null;
  openCount: number;
  overdueCount: number;
  urgentCount: number;
  items: NurseTaskItem[];
};

function isOpenStatus(status: TaskStatus): boolean {
  return status !== 'completed' && status !== 'cancelled' && status !== 'failed' && status !== 'entered-in-error';
}

function isUrgentPriority(priority: MedplumTaskResource['priority'] | undefined): boolean {
  return priority === 'urgent' || priority === 'asap' || priority === 'stat';
}

/** Tasks routed to this nurse (handoffs, follow-ups, escalation co-signs). */
export async function getNurseTasksData(): Promise<NurseTasksData> {
  const { user: staff } = await requireStaffCan('workspace.nursing.access');

  const staffRecord = await prisma.staff.findUnique({
    where: { id: staff.staffId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!staffRecord) {
    return { warning: 'Could not find your staff profile.', openCount: 0, overdueCount: 0, urgentCount: 0, items: [] };
  }

  const practitioner = await ensureCachedMedplumPractitionerForStaff({
    staffId: staffRecord.id,
    name: staffRecord.name ?? staffRecord.email ?? `Staff ${staffRecord.id}`,
    email: staffRecord.email,
    role: staffRecord.role,
  });

  let tasks: MedplumTaskResource[] = [];
  try {
    tasks = await listTasksByOwner(practitioner.reference, 150);
  } catch {
    return { warning: 'Tasks are temporarily unavailable. Please retry shortly.', openCount: 0, overdueCount: 0, urgentCount: 0, items: [] };
  }

  const now = Date.now();
  const items = tasks
    .filter((task) => !!task.id)
    .map(
      (task): NurseTaskItem => ({
        id: task.id as string,
        title: task.code?.text ?? task.code?.coding?.[0]?.display ?? 'Task',
        description: task.description ?? null,
        status: task.status,
        priority: task.priority ?? null,
        patientReference: task.for?.reference ?? null,
        dueAtIso: task.executionPeriod?.end ?? null,
        lastUpdatedIso: task.meta?.lastUpdated ?? null,
      }),
    );

  const openCount = items.filter((item) => isOpenStatus(item.status)).length;
  const urgentCount = items.filter((item) => isOpenStatus(item.status) && isUrgentPriority(item.priority ?? undefined)).length;
  const overdueCount = items.filter((item) => {
    if (!isOpenStatus(item.status) || !item.dueAtIso) return false;
    const due = new Date(item.dueAtIso).getTime();
    return Number.isFinite(due) && due < now;
  }).length;

  return { warning: null, openCount, overdueCount, urgentCount, items };
}
