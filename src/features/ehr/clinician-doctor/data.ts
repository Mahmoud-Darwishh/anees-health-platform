import 'server-only';

import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { prisma } from '@/lib/db/prisma';
import { sessionTenantId } from '@/lib/db/tenant-scope';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { listCareTeamPatientIdsForPractitioner } from '@/lib/medplum/care-teams';
import { listTasksByOwner, type MedplumTaskResource } from '@/lib/medplum/tasks';

export type DoctorTaskItem = {
  id: string;
  title: string;
  description: string | null;
  code: string | null;
  priority: MedplumTaskResource['priority'] | null;
  status: MedplumTaskResource['status'];
  patientMedplumId: string | null;
  dueAtIso: string | null;
  isOverdue: boolean;
};

export type DoctorCasePatient = {
  id: string;
  medplumPatientId: string;
  code: string;
  fullName: string;
  arabicName: string | null;
  dnr: boolean;
  activePlanName: string | null;
};

export type DoctorWorklistData = {
  patients: DoctorCasePatient[];
  tasks: DoctorTaskItem[];
  openTaskCount: number;
  urgentCount: number;
  overdueCount: number;
  warning: string | null;
};

function extractMedplumPatientId(reference: string | null | undefined): string | null {
  if (!reference) return null;
  const match = reference.match(/^Patient\/(.+)$/);
  return match ? match[1] : null;
}

function isOpenStatus(status: MedplumTaskResource['status']): boolean {
  return status !== 'completed' && status !== 'cancelled' && status !== 'failed' && status !== 'entered-in-error';
}

function isUrgentPriority(priority: MedplumTaskResource['priority'] | undefined): boolean {
  return priority === 'urgent' || priority === 'asap' || priority === 'stat';
}

export async function getDoctorWorklistData(): Promise<DoctorWorklistData> {
  const { user: staff } = await requireStaffCan('workspace.doctor.access');

  const staffRecord = await prisma.staff.findUnique({
    where: { id: staff.staffId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!staffRecord) {
    return { patients: [], tasks: [], openTaskCount: 0, urgentCount: 0, overdueCount: 0, warning: 'Could not find your staff profile.' };
  }

  const practitioner = await ensureCachedMedplumPractitionerForStaff({
    staffId: staffRecord.id,
    name: staffRecord.name ?? staffRecord.email ?? `Staff ${staffRecord.id}`,
    email: staffRecord.email,
    role: staffRecord.role,
  });

  let warning: string | null = null;

  // ── Case-team patients ──────────────────────────────────────────────────
  let caseMedplumIds: string[] = [];
  try {
    caseMedplumIds = await listCareTeamPatientIdsForPractitioner(practitioner.reference);
  } catch {
    warning = 'Your assigned-patient list is temporarily unavailable. Please retry shortly.';
  }

  const patientRows = caseMedplumIds.length
    ? await prisma.patient.findMany({
        where: {
          tenantId: sessionTenantId(staff),
          deletedAt: null,
          medplumPatientId: { in: caseMedplumIds },
        },
        select: {
          id: true,
          medplumPatientId: true,
          code: true,
          fullName: true,
          arabicName: true,
          dnrStatus: true,
          carePlans: {
            where: { status: 'active' },
            orderBy: { updatedAt: 'desc' },
            take: 1,
            select: { planName: true },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 200,
      })
    : [];

  const patients: DoctorCasePatient[] = patientRows
    .filter((row) => !!row.medplumPatientId)
    .map((row) => ({
      id: row.id,
      medplumPatientId: row.medplumPatientId as string,
      code: row.code,
      fullName: row.fullName,
      arabicName: row.arabicName,
      dnr: row.dnrStatus === 'dnr',
      activePlanName: row.carePlans[0]?.planName ?? null,
    }));

  // ── Open tasks (co-sign, review, follow-up) owned by this doctor ─────────
  let taskResources: MedplumTaskResource[] = [];
  try {
    taskResources = await listTasksByOwner(practitioner.reference, 150);
  } catch {
    warning = warning ?? 'Your task list is temporarily unavailable. Please retry shortly.';
  }

  const now = Date.now();
  const tasks: DoctorTaskItem[] = taskResources
    .filter((task) => !!task.id && isOpenStatus(task.status))
    .map((task) => {
      const dueAtIso = task.executionPeriod?.end ?? null;
      const dueMs = dueAtIso ? new Date(dueAtIso).getTime() : NaN;
      return {
        id: task.id as string,
        title: task.code?.text ?? task.code?.coding?.[0]?.display ?? 'Task',
        description: task.description ?? null,
        code: task.code?.coding?.[0]?.code ?? null,
        priority: task.priority ?? null,
        status: task.status,
        patientMedplumId: extractMedplumPatientId(task.for?.reference),
        dueAtIso,
        isOverdue: Number.isFinite(dueMs) && dueMs < now,
      };
    });

  return {
    patients,
    tasks,
    openTaskCount: tasks.length,
    urgentCount: tasks.filter((task) => isUrgentPriority(task.priority ?? undefined)).length,
    overdueCount: tasks.filter((task) => task.isOverdue).length,
    warning,
  };
}
