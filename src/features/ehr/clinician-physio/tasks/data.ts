import 'server-only';

import type { StaffRole } from '@prisma/client';
import { getStaffUser } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { listTasksByOwner, type MedplumTaskResource } from '@/lib/medplum/tasks';

const PHYSIO_WORKSPACE_ROLES: StaffRole[] = ['physiotherapist', 'admin', 'superadmin'];

type TaskStatus = MedplumTaskResource['status'];

export type ClinicianTaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: MedplumTaskResource['priority'] | null;
  patientReference: string | null;
  dueAtIso: string | null;
  authoredOnIso: string | null;
  lastUpdatedIso: string | null;
};

export type ClinicianTasksData = {
  warning: string | null;
  ownerReference: string | null;
  openCount: number;
  overdueCount: number;
  urgentCount: number;
  items: ClinicianTaskItem[];
};

function extractTaskTitle(task: MedplumTaskResource): string {
  return task.code?.text ?? task.code?.coding?.[0]?.display ?? 'Task';
}

function isOpenStatus(status: TaskStatus): boolean {
  return status !== 'completed' && status !== 'cancelled' && status !== 'failed' && status !== 'entered-in-error';
}

function isUrgentPriority(priority: MedplumTaskResource['priority'] | undefined): boolean {
  return priority === 'urgent' || priority === 'asap' || priority === 'stat';
}

export async function getClinicianTasksData(): Promise<ClinicianTasksData> {
  const staff = await getStaffUser(PHYSIO_WORKSPACE_ROLES);
  if (!staff?.staffId || !staff.staffRole) {
    throw new Error('Unauthorized');
  }

  const staffRecord = await prisma.staff.findUnique({
    where: { id: staff.staffId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!staffRecord) {
    return {
      warning: 'Could not find your staff profile.',
      ownerReference: null,
      openCount: 0,
      overdueCount: 0,
      urgentCount: 0,
      items: [],
    };
  }

  const practitioner = await ensureCachedMedplumPractitionerForStaff({
    staffId: staffRecord.id,
    name: staffRecord.name ?? staffRecord.email ?? `Staff ${staffRecord.id}`,
    email: staffRecord.email,
    role: staffRecord.role,
  });

  const ownerReference = practitioner.reference;

  let tasks: MedplumTaskResource[] = [];
  try {
    tasks = await listTasksByOwner(ownerReference, 150);
  } catch {
    return {
      warning: 'Tasks are temporarily unavailable. Please retry shortly.',
      ownerReference,
      openCount: 0,
      overdueCount: 0,
      urgentCount: 0,
      items: [],
    };
  }

  const now = Date.now();
  const items = tasks
    .filter((task) => !!task.id)
    .map(
      (task): ClinicianTaskItem => ({
        id: task.id as string,
        title: extractTaskTitle(task),
        description: task.description ?? null,
        status: task.status,
        priority: task.priority ?? null,
        patientReference: task.for?.reference ?? null,
        dueAtIso: task.executionPeriod?.end ?? null,
        authoredOnIso: task.authoredOn ?? null,
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

  return {
    warning: null,
    ownerReference,
    openCount,
    overdueCount,
    urgentCount,
    items,
  };
}