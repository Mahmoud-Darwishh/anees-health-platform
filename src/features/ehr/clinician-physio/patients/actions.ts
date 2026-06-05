'use server';

import { AuditAction } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { getStaffUser } from '@/lib/auth/rbac';
import { prisma } from '@/lib/db/prisma';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { listCareTeamPatientIdsForPractitioner } from '@/lib/medplum/care-teams';
import { createClinicalNoteDraft, signClinicalNote } from '@/lib/medplum/clinical-notes';
import { upsertMedplumGoalFromLegacy } from '@/lib/medplum/goals';
import {
  parseCreateDischargeSummaryForm,
  parseCreatePatientGoalForm,
  parseMarkPatientGoalMetForm,
  parseUpdatePatientGoalProgressForm,
} from './goal-discharge-schemas';

const PHYSIO_WORKSPACE_ROLES = ['physiotherapist', 'admin', 'superadmin'] as const;

function revalidateClinicianPatientsViews(): void {
  revalidatePath('/clinician/today');
  revalidatePath('/clinician/patients');
}

type ScopedStaffContext = {
  staffId: string;
  staffName: string;
  staffEmail: string | null;
  practitionerReference: string | null;
  practitionerDisplay: string;
};

async function writePatientGoalAudit(params: {
  action: 'create' | 'update';
  recordId: string;
  patientId: string;
  staffId: string;
  changedFields: string[];
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tableName: 'patient_goals',
      recordId: params.recordId,
      action: params.action,
      changedFields: params.changedFields,
      changedBy: `staff_${params.staffId}`,
    },
  });
}

async function assertPatientScope(patientId: string): Promise<ScopedStaffContext> {
  const staff = await getStaffUser([...PHYSIO_WORKSPACE_ROLES]);
  if (!staff?.staffId || !staff.staffRole) {
    throw new Error('Unauthorized');
  }

  const ownStaffRecord = await prisma.staff.findUnique({
    where: { id: staff.staffId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  if (!ownStaffRecord) {
    throw new Error('Staff profile not found.');
  }

  const context: ScopedStaffContext = {
    staffId: ownStaffRecord.id,
    staffName: ownStaffRecord.name ?? ownStaffRecord.email ?? `Staff ${ownStaffRecord.id}`,
    staffEmail: ownStaffRecord.email,
    practitionerReference: null,
    practitionerDisplay: ownStaffRecord.name ?? ownStaffRecord.email ?? `Staff ${ownStaffRecord.id}`,
  };

  if (staff.staffRole !== 'physiotherapist') {
    const practitioner = await ensureCachedMedplumPractitionerForStaff({
      staffId: ownStaffRecord.id,
      name: context.staffName,
      email: ownStaffRecord.email,
      role: ownStaffRecord.role,
    }).catch(() => null);

    if (practitioner) {
      context.practitionerReference = practitioner.reference;
      context.practitionerDisplay = practitioner.display;
    }

    return context;
  }

  const practitioner = await ensureCachedMedplumPractitionerForStaff({
    staffId: ownStaffRecord.id,
    name: context.staffName,
    email: ownStaffRecord.email,
    role: ownStaffRecord.role,
  });

  const caseScopedMedplumIds = await listCareTeamPatientIdsForPractitioner(practitioner.reference);
  if (caseScopedMedplumIds.length === 0) {
    throw new Error('No case-scoped patients are assigned yet.');
  }

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { medplumPatientId: true },
  });

  if (!patient?.medplumPatientId || !caseScopedMedplumIds.includes(patient.medplumPatientId)) {
    throw new Error('This patient is outside your case scope.');
  }

  context.practitionerReference = practitioner.reference;
  context.practitionerDisplay = practitioner.display;

  return context;
}

type GoalSyncInput = {
  goal: {
    id: string;
    text: string;
    category: string | null;
    baselineValue: string | null;
    currentValue: string | null;
    targetValue: string | null;
    measurementUnit: string | null;
    targetDate: Date | null;
    status: 'in_progress' | 'met' | 'discontinued';
    metAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  patientMedplumId: string;
  context: ScopedStaffContext;
};

async function syncGoalToMedplum(input: GoalSyncInput): Promise<string> {
  const fhirGoal = await upsertMedplumGoalFromLegacy({
    localGoalId: input.goal.id,
    patientMedplumId: input.patientMedplumId,
    text: input.goal.text,
    category: input.goal.category,
    baselineValue: input.goal.baselineValue,
    currentValue: input.goal.currentValue,
    targetValue: input.goal.targetValue,
    measurementUnit: input.goal.measurementUnit,
    targetDate: input.goal.targetDate,
    status: input.goal.status,
    metAt: input.goal.metAt,
    createdAt: input.goal.createdAt,
    updatedAt: input.goal.updatedAt,
    authorReference: input.context.practitionerReference ?? undefined,
    authorDisplay: input.context.practitionerDisplay,
  });

  if (!fhirGoal.id) {
    throw new Error('FHIR Goal id missing after sync.');
  }

  return fhirGoal.id;
}

export async function createPatientGoalAction(formData: FormData): Promise<void> {
  const input = parseCreatePatientGoalForm(formData);
  const context = await assertPatientScope(input.patientId);

  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId },
    select: { medplumPatientId: true },
  });

  if (!patient?.medplumPatientId) {
    throw new Error('Patient Medplum identifier is missing.');
  }

  const createdGoal = await prisma.patientGoal.create({
    data: {
      id: crypto.randomUUID(),
      patientId: input.patientId,
      authorStaffId: context.staffId,
      text: input.text,
      category: input.category,
      baselineValue: input.baselineValue,
      targetValue: input.targetValue,
      measurementUnit: input.measurementUnit,
      targetDate: input.targetDate,
      status: 'in_progress',
    },
    select: {
      id: true,
      text: true,
      category: true,
      baselineValue: true,
      currentValue: true,
      targetValue: true,
      measurementUnit: true,
      targetDate: true,
      status: true,
      metAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  try {
    const fhirGoalId = await syncGoalToMedplum({
      goal: createdGoal,
      patientMedplumId: patient.medplumPatientId,
      context,
    });

    await prisma.patientGoal.update({
      where: { id: createdGoal.id },
      data: { fhirGoalId },
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumGoal',
      recordId: fhirGoalId,
      action: AuditAction.create,
      changedBy: `staff_${context.staffId}`,
      changedFields: ['description', 'lifecycleStatus', 'subject', 'target', 'note'],
    });
  } catch (error) {
    await prisma.patientGoal.delete({ where: { id: createdGoal.id } }).catch(() => undefined);
    throw error;
  }

  await writePatientGoalAudit({
    action: 'create',
    recordId: createdGoal.id,
    patientId: input.patientId,
    staffId: context.staffId,
    changedFields: ['patientId', 'category', 'status'],
  });

  revalidateClinicianPatientsViews();
}

export async function updatePatientGoalProgressAction(formData: FormData): Promise<void> {
  const input = parseUpdatePatientGoalProgressForm(formData);
  const context = await assertPatientScope(input.patientId);

  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId },
    select: { medplumPatientId: true },
  });

  if (!patient?.medplumPatientId) {
    throw new Error('Patient Medplum identifier is missing.');
  }

  const existing = await prisma.patientGoal.findFirst({
    where: {
      id: input.goalId,
      patientId: input.patientId,
    },
    select: {
      id: true,
      text: true,
      category: true,
      baselineValue: true,
      currentValue: true,
      targetValue: true,
      measurementUnit: true,
      targetDate: true,
      status: true,
      metAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!existing) {
    throw new Error('Goal not found for this patient.');
  }

  const updatedGoal = await prisma.patientGoal.update({
    where: { id: input.goalId },
    data: {
      currentValue: input.currentValue,
    },
    select: {
      id: true,
      fhirGoalId: true,
      text: true,
      category: true,
      baselineValue: true,
      currentValue: true,
      targetValue: true,
      measurementUnit: true,
      targetDate: true,
      status: true,
      metAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  try {
    const fhirGoalId = await syncGoalToMedplum({
      goal: updatedGoal,
      patientMedplumId: patient.medplumPatientId,
      context,
    });

    if (updatedGoal.fhirGoalId !== fhirGoalId) {
      await prisma.patientGoal.update({
        where: { id: updatedGoal.id },
        data: { fhirGoalId },
      });
    }

    await writeMedplumAuditMirror({
      tableName: 'MedplumGoal',
      recordId: fhirGoalId,
      action: AuditAction.update,
      changedBy: `staff_${context.staffId}`,
      changedFields: ['note'],
    });
  } catch (error) {
    await prisma.patientGoal.update({
      where: { id: existing.id },
      data: {
        currentValue: existing.currentValue,
      },
    });
    throw error;
  }

  await writePatientGoalAudit({
    action: 'update',
    recordId: input.goalId,
    patientId: input.patientId,
    staffId: context.staffId,
    changedFields: ['currentValue'],
  });

  revalidateClinicianPatientsViews();
}

export async function markPatientGoalMetAction(formData: FormData): Promise<void> {
  const input = parseMarkPatientGoalMetForm(formData);
  const context = await assertPatientScope(input.patientId);

  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId },
    select: { medplumPatientId: true },
  });

  if (!patient?.medplumPatientId) {
    throw new Error('Patient Medplum identifier is missing.');
  }

  const existing = await prisma.patientGoal.findFirst({
    where: {
      id: input.goalId,
      patientId: input.patientId,
    },
    select: {
      id: true,
      text: true,
      category: true,
      baselineValue: true,
      currentValue: true,
      targetValue: true,
      measurementUnit: true,
      targetDate: true,
      status: true,
      metAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!existing) {
    throw new Error('Goal not found for this patient.');
  }

  const metAt = new Date();
  const updatedGoal = await prisma.patientGoal.update({
    where: { id: input.goalId },
    data: {
      status: 'met',
      metAt,
    },
    select: {
      id: true,
      fhirGoalId: true,
      text: true,
      category: true,
      baselineValue: true,
      currentValue: true,
      targetValue: true,
      measurementUnit: true,
      targetDate: true,
      status: true,
      metAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  try {
    const fhirGoalId = await syncGoalToMedplum({
      goal: updatedGoal,
      patientMedplumId: patient.medplumPatientId,
      context,
    });

    if (updatedGoal.fhirGoalId !== fhirGoalId) {
      await prisma.patientGoal.update({
        where: { id: updatedGoal.id },
        data: { fhirGoalId },
      });
    }

    await writeMedplumAuditMirror({
      tableName: 'MedplumGoal',
      recordId: fhirGoalId,
      action: AuditAction.update,
      changedBy: `staff_${context.staffId}`,
      changedFields: ['lifecycleStatus', 'achievementStatus', 'statusDate', 'note'],
    });
  } catch (error) {
    await prisma.patientGoal.update({
      where: { id: existing.id },
      data: {
        status: existing.status,
        metAt: existing.metAt,
      },
    });
    throw error;
  }

  await writePatientGoalAudit({
    action: 'update',
    recordId: input.goalId,
    patientId: input.patientId,
    staffId: context.staffId,
    changedFields: ['status', 'metAt'],
  });

  revalidateClinicianPatientsViews();
}

export async function createDischargeSummaryAction(formData: FormData): Promise<void> {
  const input = parseCreateDischargeSummaryForm(formData);
  const staffContext = await assertPatientScope(input.patientId);

  const patient = await prisma.patient.findUnique({
    where: { id: input.patientId },
    select: {
      medplumPatientId: true,
      fullName: true,
    },
  });

  if (!patient?.medplumPatientId) {
    throw new Error('Patient Medplum identifier is missing.');
  }

  const [totalGoals, metGoals] = await Promise.all([
    prisma.patientGoal.count({ where: { patientId: input.patientId } }),
    prisma.patientGoal.count({ where: { patientId: input.patientId, status: 'met' } }),
  ]);

  const autoSummary = `Patient: ${patient.fullName}. Goals met: ${metGoals}/${totalGoals}.`;
  const body = [
    'Physio Discharge Summary',
    input.includeAutoSummary ? autoSummary : null,
    `Recommendations: ${input.recommendations}`,
    input.followUpPlan ? `Follow-up plan: ${input.followUpPlan}` : null,
  ]
    .filter(Boolean)
    .join('\n\n');

  // TODO(audit): wire when auth lands
  const draft = await createClinicalNoteDraft({
    patientId: patient.medplumPatientId,
    title: 'Physio Discharge Summary',
    noteBody: body,
    discipline: 'physiotherapy',
    authorReference: undefined,
    authorDisplay: staffContext.staffName,
  });

  if (!draft.id) {
    throw new Error('Failed to create discharge summary draft.');
  }

  await signClinicalNote(draft.id, {
    authorReference: undefined,
    authorDisplay: staffContext.staffName,
  });

  revalidateClinicianPatientsViews();
}