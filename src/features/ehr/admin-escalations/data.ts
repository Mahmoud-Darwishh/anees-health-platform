import 'server-only';

import { isCaseScopedClinicalRole } from '@/lib/auth/rbac';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { prisma } from '@/lib/db/prisma';
import { sessionTenantId } from '@/lib/db/tenant-scope';
import { listEscalationTasks } from '@/lib/medplum/tasks';
import { listMedplumPatients } from '@/lib/medplum/patients';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { listCareTeamPatientIdsForPractitioner } from '@/lib/medplum/care-teams';
import { ANEES_PATIENT_CODE_SYSTEM } from '@/features/ehr/admin-patient/constants';
import type { AdminEscalationsData, EscalationQueueItem } from './types';

function patientDisplayName(patient: { name?: Array<{ text?: string }> }): string {
  return patient.name?.[0]?.text ?? 'Unknown patient';
}

function patientCode(patient: { identifier?: Array<{ system?: string; value?: string }> }): string | null {
  return patient.identifier?.find((entry) => entry.system === ANEES_PATIENT_CODE_SYSTEM)?.value ?? null;
}

export async function loadAdminEscalationsData(): Promise<AdminEscalationsData> {
  let user: Awaited<ReturnType<typeof requireStaffCan>>['user'];
  try {
    ({ user } = await requireStaffCan('escalation.read', {
      audit: {
        tableName: 'escalations',
        recordId: 'admin_escalations',
      },
    }));
  } catch {
    return {
      error: 'Unauthorized',
      items: [],
      myItems: [],
      unassignedItems: [],
      myReference: null,
      staffName: 'Unknown',
      staffRole: null,
    };
  }

  let myReference: string | null = null;
  let visiblePatientIdsSet: Set<string> | null = null;

  if (isCaseScopedClinicalRole(user.staffRole)) {
    const practitioner = await ensureCachedMedplumPractitionerForStaff({
      staffId: user.staffId,
      name: user.name ?? user.email ?? `Staff ${user.staffId}`,
      email: user.email,
      role: user.staffRole,
    });

    myReference = practitioner.reference;
    const visiblePatientIds = await listCareTeamPatientIdsForPractitioner(practitioner.reference);
    visiblePatientIdsSet = new Set(visiblePatientIds);
  } else {
    const practitioner = await ensureCachedMedplumPractitionerForStaff({
      staffId: user.staffId,
      name: user.name ?? user.email ?? `Staff ${user.staffId}`,
      email: user.email,
      role: user.staffRole,
    });
    myReference = practitioner.reference;
  }

  const [taskResult, patientsResult] = await Promise.allSettled([
    listEscalationTasks({ count: 300 }),
    listMedplumPatients(),
  ]);

  if (taskResult.status === 'rejected') {
    return {
      error: taskResult.reason instanceof Error ? taskResult.reason.message : 'Failed to load escalations from Medplum.',
      items: [],
      myItems: [],
      unassignedItems: [],
      myReference,
      staffName: user.name ?? user.email ?? 'Staff user',
      staffRole: user.staffRole,
    };
  }

  const patientMap =
    patientsResult.status === 'fulfilled'
      ? new Map(
          patientsResult.value
            .filter((patient) => !!patient.id)
            .map((patient) => [
              patient.id as string,
              {
                name: patientDisplayName(patient),
                code: patientCode(patient),
              },
            ]),
        )
      : new Map<string, { name: string; code: string | null }>();

  const tenantScopedPatientIds = await prisma.patient.findMany({
    where: {
      tenantId: sessionTenantId(user),
      deletedAt: null,
      medplumPatientId: {
        not: null,
      },
    },
    select: {
      medplumPatientId: true,
    },
  });
  const tenantScopedIdSet = new Set(
    tenantScopedPatientIds
      .map((row) => row.medplumPatientId)
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  );

  const items: EscalationQueueItem[] = taskResult.value
    .filter((task) => !!task.patientId)
    .filter((task) => (user.staffRole === 'superadmin' ? true : (task.patientId ? tenantScopedIdSet.has(task.patientId) : false)))
    .filter((task) => !visiblePatientIdsSet || (task.patientId ? visiblePatientIdsSet.has(task.patientId) : false))
    .map((task) => {
      const patientProfile = task.patientId ? patientMap.get(task.patientId) : null;
      const dueAt = task.dueAt ? new Date(task.dueAt) : null;
      const isOverdue = !!dueAt && dueAt.getTime() < Date.now() && !['completed', 'cancelled'].includes(task.status);

      return {
        ...task,
        patientName: patientProfile?.name ?? 'Unknown patient',
        patientCode: patientProfile?.code ?? null,
        isOverdue,
      };
    });

  const myItems = myReference ? items.filter((item) => item.ownerReference === myReference) : [];
  const unassignedItems = items.filter((item) => !item.ownerReference);

  return {
    error: null,
    items,
    myItems,
    unassignedItems,
    myReference,
    staffName: user.name ?? user.email ?? 'Staff user',
    staffRole: user.staffRole,
  };
}
