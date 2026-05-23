'use server';

import { requireStaffPermission } from '@/lib/auth';
import { canAccessPatientRecord } from '@/lib/auth/record-access';
import { getAuditedPrisma } from '@/lib/db/audited-prisma';
import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function assertStaffRoleAllowed(
  role: string | null | undefined,
  allowed: Array<'physiotherapist'>,
) {
  if (!role || !allowed.includes(role as (typeof allowed)[number])) {
    throw new Error('Forbidden');
  }
}

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

function parseOptionalInt(formData: FormData, name: string): number | null {
  const value = getText(formData, name, 8);
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalFloat(formData: FormData, name: string): number | null {
  const value = getText(formData, name, 24);
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function recordPhysioAttendanceAction(formData: FormData) {
  const session = await requireStaffPermission('physio.attendance.write');
  assertStaffRoleAllowed(session.user.staffRole, ['physiotherapist']);
  const authorStaffId = session.user.staffId;
  if (!authorStaffId) {
    throw new Error('Staff profile is not linked');
  }
  const auditedPrisma = getAuditedPrisma(authorStaffId);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const attendanceAction = getText(formData, 'attendanceAction', 24);
  const attendanceNote = getText(formData, 'attendanceNote', 800);
  const gpsLatitude = parseOptionalFloat(formData, 'gpsLatitude');
  const gpsLongitude = parseOptionalFloat(formData, 'gpsLongitude');
  const gpsAccuracyMeters = parseOptionalFloat(formData, 'gpsAccuracyMeters');
  const selfieEvidenceHash = getText(formData, 'selfieEvidenceHash', 320);
  const faceIdEvidenceHash = getText(formData, 'faceIdEvidenceHash', 320);
  const faceIdConfidenceScore = parseOptionalFloat(formData, 'faceIdConfidenceScore');
  const signedAuditBundle = getText(formData, 'signedAuditBundle', 8000);

  if (!patientId || !visitId || (attendanceAction !== 'check_in' && attendanceAction !== 'check_out')) {
    throw new Error('Invalid attendance payload');
  }

  if (gpsLatitude !== null && (gpsLatitude < -90 || gpsLatitude > 90)) {
    throw new Error('Invalid GPS latitude');
  }
  if (gpsLongitude !== null && (gpsLongitude < -180 || gpsLongitude > 180)) {
    throw new Error('Invalid GPS longitude');
  }
  if (gpsAccuracyMeters !== null && gpsAccuracyMeters < 0) {
    throw new Error('Invalid GPS accuracy');
  }
  if (faceIdConfidenceScore !== null && (faceIdConfidenceScore < 0 || faceIdConfidenceScore > 100)) {
    throw new Error('Invalid Face ID confidence score');
  }

  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
    select: { id: true, patientId: true, scheduledDate: true },
  });

  if (!visit || visit.patientId !== patientId) {
    throw new Error('Visit not found for patient');
  }

  const now = new Date();

  if (attendanceAction === 'check_in') {
    await auditedPrisma.visit.update({
      where: { id: visitId },
      data: {
        status: 'in_progress',
      },
    });
  } else {
    await auditedPrisma.visit.update({
      where: { id: visitId },
      data: {
        status: 'completed',
        completedDatetime: now,
      },
    });
  }

  await auditedPrisma.careTeamMessage.create({
    data: {
      patientId,
      relatedVisitId: visitId,
      channelType: 'physio_attendance',
      messageBody: [
        attendanceAction === 'check_in' ? 'Physio session check-in recorded.' : 'Physio session check-out recorded.',
        attendanceNote ? `Note: ${attendanceNote}` : null,
      ]
        .filter(Boolean)
        .join(' '),
      requiresFollowUp: false,
      authorStaffId,
    },
  });

  await auditedPrisma.physioAttendanceProof.create({
    data: {
      patientId,
      visitId,
      staffId: authorStaffId,
      attendanceEvent: attendanceAction,
      attendedAt: now,
      gpsLatitude,
      gpsLongitude,
      gpsAccuracyMeters,
      selfieEvidenceHash,
      faceIdEvidenceHash,
      faceIdConfidenceScore,
      signedAuditBundle,
      verificationNotes: attendanceNote,
    },
  });

  revalidatePath('/admin/physio');
  revalidatePath(`/admin/patients/${patientId}`);
  redirect('/admin/physio?updated=attendance');
}

export async function addPhysioWorkspaceReportAction(formData: FormData) {
  const session = await requireStaffPermission('physio.write');
  assertStaffRoleAllowed(session.user.staffRole, ['physiotherapist']);
  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  const patientId = getText(formData, 'patientId', 64);
  const visitId = getText(formData, 'visitId', 64);
  const sessionDate = getOptionalDate(formData, 'sessionDate');
  const sessionNumber = parseOptionalInt(formData, 'sessionNumber');
  const treatmentPlan = getText(formData, 'treatmentPlan', 1200);
  const interventions = getText(formData, 'interventions', 3000);
  const response = getText(formData, 'response', 2000);
  const mobilityNote = getText(formData, 'mobilityNote', 1200);
  const homeExercisePlan = getText(formData, 'homeExercisePlan', 1500);
  const nextSessionDate = getOptionalDate(formData, 'nextSessionDate');
  const painScoreBefore = parseOptionalInt(formData, 'painScoreBefore');
  const painScoreAfter = parseOptionalInt(formData, 'painScoreAfter');

  if (!patientId || !sessionDate || !sessionNumber || !interventions) {
    throw new Error('Invalid physio session payload');
  }

  if (!(await canAccessPatientRecord(session, patientId))) {
    throw new Error('Forbidden');
  }

  await auditedPrisma.physioSessionReport.create({
    data: {
      patientId,
      visitId,
      sessionDate,
      sessionNumber,
      treatmentPlan,
      interventions,
      response,
      mobilityNote,
      homeExercisePlan,
      nextSessionDate,
      painScoreBefore,
      painScoreAfter,
      enteredByStaffId: session.user.staffId ?? null,
    },
  });

  revalidatePath('/admin/physio');
  revalidatePath(`/admin/patients/${patientId}`);
  redirect('/admin/physio?updated=report');
}
