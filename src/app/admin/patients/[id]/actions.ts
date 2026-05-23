'use server';

import { requireStaffPermission } from '@/lib/auth';
import { canAccessPatientRecord, canBypassPatientAssignment } from '@/lib/auth/record-access';
import { getAuditedPrisma } from '@/lib/db/audited-prisma';
import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function getText(formData: FormData, name: string, maxLen: number): string | null {
  const value = formData.get(name);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function getOptionalDate(formData: FormData, name: string): Date | null {
  const value = formData.get(name);
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function updatePatientCoreAction(formData: FormData) {
  const session = await requireStaffPermission('patients.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  if (!patientId) throw new Error('Invalid patient');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  const status = getText(formData, 'status', 20);
  const chiefComplaint = getText(formData, 'chiefComplaint', 500);
  const notes = getText(formData, 'notes', 2000);

  await auditedPrisma.patient.update({
    where: { id: patientId },
    data: {
      ...(status ? { status: status as 'new' | 'active' | 'lapsed' | 'inactive' } : {}),
      chiefComplaint,
      notes,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirect(`/admin/patients/${patientId}?updated=core`);
}

export async function addAllergyAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const allergen = getText(formData, 'allergen', 140);
  const reaction = getText(formData, 'reaction', 300);
  const severity = getText(formData, 'severity', 40);
  const notes = getText(formData, 'notes', 1000);

  if (!patientId || !allergen) throw new Error('Invalid allergy payload');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.allergy.create({
    data: {
      patientId,
      allergen,
      reaction,
      severity,
      notes,
      enteredByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirect(`/admin/patients/${patientId}?updated=allergy`);
}

export async function addMedicationAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const medicationName = getText(formData, 'medicationName', 160);
  const dose = getText(formData, 'dose', 100);
  const frequency = getText(formData, 'frequency', 100);
  const route = getText(formData, 'route', 80);
  const startDate = getOptionalDate(formData, 'startDate');
  const notes = getText(formData, 'notes', 1000);

  if (!patientId || !medicationName) throw new Error('Invalid medication payload');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.medication.create({
    data: {
      patientId,
      medicationName,
      dose,
      frequency,
      route,
      startDate,
      notes,
      enteredByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirect(`/admin/patients/${patientId}?updated=medication`);
}

export async function addProgressNoteAction(formData: FormData) {
  const session = await requireStaffPermission('clinical.write');
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const noteBody = getText(formData, 'noteBody', 8000);
  const signedOff = formData.get('signedOff') === 'on';

  if (!patientId || !noteBody) throw new Error('Invalid progress note payload');
  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.progressNote.create({
    data: {
      patientId,
      visitId,
      noteBody,
      enteredByStaffId: session.user.staffId ?? null,
      ...(signedOff
        ? {
            signedOffAt: new Date(),
            signedOffByStaffId: session.user.staffId ?? null,
          }
        : {}),
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirect(`/admin/patients/${patientId}?updated=progress-note`);
}

export async function assignStaffToPatientAction(formData: FormData) {
  const session = await requireStaffPermission('admin.manage');
  if (!canBypassPatientAssignment(session)) {
    throw new Error('Forbidden');
  }

  const patientId = getText(formData, 'patientId', 64);
  const staffId = getText(formData, 'staffId', 64);
  if (!patientId || !staffId) {
    throw new Error('Invalid assignment payload');
  }

  await prisma.staffPatientAssignment.upsert({
    where: {
      staffId_patientId: {
        staffId,
        patientId,
      },
    },
    update: {
      isActive: true,
      assignedAt: new Date(),
      assignedBy: session.user.staffId ?? session.user.id,
    },
    create: {
      staffId,
      patientId,
      isActive: true,
      assignedBy: session.user.staffId ?? session.user.id,
    },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirect(`/admin/patients/${patientId}?updated=assignment`);
}

export async function removeStaffAssignmentAction(formData: FormData) {
  const session = await requireStaffPermission('admin.manage');
  if (!canBypassPatientAssignment(session)) {
    throw new Error('Forbidden');
  }

  const assignmentId = getText(formData, 'assignmentId', 64);
  const patientId = getText(formData, 'patientId', 64);
  if (!assignmentId || !patientId) {
    throw new Error('Invalid unassignment payload');
  }

  await prisma.staffPatientAssignment.update({
    where: { id: assignmentId },
    data: { isActive: false },
  });

  revalidatePath(`/admin/patients/${patientId}`);
  redirect(`/admin/patients/${patientId}?updated=assignment-removed`);
}
