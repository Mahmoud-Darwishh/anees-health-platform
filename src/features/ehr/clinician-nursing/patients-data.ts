import 'server-only';

import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { prisma } from '@/lib/db/prisma';
import { sessionTenantId } from '@/lib/db/tenant-scope';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { listCareTeamPatientIdsForPractitioner } from '@/lib/medplum/care-teams';

export type NursePatientListItem = {
  id: string;
  medplumPatientId: string;
  code: string;
  fullName: string;
  arabicName: string | null;
  dnr: boolean;
  activePlanName: string | null;
};

export type NursePatientsData = {
  patients: NursePatientListItem[];
  warning: string | null;
};

/**
 * The nurse's caseload — patients whose care team this nurse is on (the same
 * case-scope that gates every clinical write). Read-only list; the chart is the
 * drill-down. Mirrors the doctor worklist's patient resolution.
 */
export async function getNursePatientsData(): Promise<NursePatientsData> {
  const { user: staff } = await requireStaffCan('workspace.nursing.access');

  const staffRecord = await prisma.staff.findUnique({
    where: { id: staff.staffId },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!staffRecord) {
    return { patients: [], warning: 'Could not find your staff profile.' };
  }

  const practitioner = await ensureCachedMedplumPractitionerForStaff({
    staffId: staffRecord.id,
    name: staffRecord.name ?? staffRecord.email ?? `Staff ${staffRecord.id}`,
    email: staffRecord.email,
    role: staffRecord.role,
  });

  let caseMedplumIds: string[] = [];
  try {
    caseMedplumIds = await listCareTeamPatientIdsForPractitioner(practitioner.reference);
  } catch {
    return { patients: [], warning: 'Your patient list is temporarily unavailable. Please retry shortly.' };
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

  const patients: NursePatientListItem[] = patientRows
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

  return { patients, warning: null };
}
