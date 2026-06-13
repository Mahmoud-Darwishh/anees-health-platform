import 'server-only';

import type { StaffRole } from '@prisma/client';
import { ensureCachedMedplumPractitionerForStaff, ensureMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { getSessionUser, isStaff } from '@/lib/auth/rbac';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import type { ActionName } from '@/lib/auth/policy/actions';
import { prisma } from '@/lib/db/prisma';

export function noteDraftActionForDiscipline(discipline: 'nursing' | 'physiotherapy' | 'medical'): ActionName {
  if (discipline === 'nursing') return 'note.nursing.create_draft';
  if (discipline === 'physiotherapy') return 'note.physio.create_draft';
  return 'note.medical.create_draft';
}

export function noteSignActionForDiscipline(discipline: 'nursing' | 'physiotherapy' | 'medical'): ActionName {
  if (discipline === 'nursing') return 'note.nursing.sign';
  if (discipline === 'physiotherapy') return 'note.physio.sign';
  return 'note.medical.sign';
}

export async function requireAdminPatientAction(
  action: ActionName,
  medplumPatientId: string,
  auditTableName = 'admin_patient_action',
): Promise<void> {
  await requireStaffCan(action, {
    targetPatientMedplumId: medplumPatientId,
    audit: {
      tableName: auditTableName,
      recordId: medplumPatientId,
    },
  });
}

export async function getClinicalWriterWithPractitioner() {
  const staff = await getSessionUser();
  if (!isStaff(staff) || !staff.staffId || !staff.staffRole) {
    throw new Error('Unauthorized');
  }

  const changedBy = staff.staffId;
  const practitioner = await ensureCachedMedplumPractitionerForStaff({
    staffId: staff.staffId,
    name: staff.name ?? staff.email ?? `Staff ${staff.staffId}`,
    email: staff.email,
    role: staff.staffRole,
  });

  return { staff, practitioner, changedBy };
}

export async function getCoordinationWriterWithPractitioner() {
  const staff = await getSessionUser();
  if (!isStaff(staff) || !staff.staffId || !staff.staffRole) {
    throw new Error('Unauthorized');
  }

  const changedBy = staff.staffId;
  const practitioner = await ensureCachedMedplumPractitionerForStaff({
    staffId: staff.staffId,
    name: staff.name ?? staff.email ?? `Staff ${staff.staffId}`,
    email: staff.email,
    role: staff.staffRole,
  });

  return { staff, practitioner, changedBy };
}

export async function resolvePractitionerFromStaffId(staffId?: string | null) {
  if (!staffId) {
    return null;
  }

  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff || staff.status !== 'active') {
    throw new Error('Selected assignee is not active.');
  }

  const practitioner = await ensureMedplumPractitionerForStaff({
    staffId: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
  });

  return {
    staff,
    practitioner,
  };
}

export async function assertRosteredNurseForPatientIfNurse(
  staff: { staffId?: string | null; staffRole?: StaffRole | null },
  medplumPatientId: string,
  atTime: Date,
): Promise<void> {
  if (staff.staffRole !== 'nurse') {
    return;
  }

  if (!staff.staffId) {
    throw new Error('Nurse account is missing staff identity.');
  }

  const localPatient = await prisma.patient.findUnique({
    where: { medplumPatientId },
    select: { id: true },
  });

  if (!localPatient?.id) {
    throw new Error('Local patient profile is missing; cannot validate roster ownership.');
  }

  const activeAssignment = await prisma.nurseShiftAssignment.findFirst({
    where: {
      patientId: localPatient.id,
      status: {
        in: ['scheduled', 'in_progress'],
      },
      shiftStartAt: {
        lte: atTime,
      },
      shiftEndAt: {
        gte: atTime,
      },
      OR: [
        { primaryNurseStaffId: staff.staffId },
        { incomingNurseStaffId: staff.staffId },
      ],
    },
    select: { id: true },
  });

  if (!activeAssignment) {
    throw new Error('Roster check failed: nurse is not assigned to an active shift for this patient at the selected time.');
  }
}
