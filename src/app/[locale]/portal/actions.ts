'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db/prisma';
import { getAuditedPrisma } from '@/lib/db/audited-prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

type VisitRequestType = 'confirm' | 'reschedule' | 'cancel';

function cleanText(value: FormDataEntryValue | null, maxLen: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

export async function updatePatientProfileAction(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== 'patient' || !session.user.patientId) {
    throw new Error('Unauthorized');
  }

  const locale = typeof formData.get('locale') === 'string' ? (formData.get('locale') as string) : 'en';
  const auditedPrisma = getAuditedPrisma(session.user.patientId ?? null);

  const phone = cleanText(formData.get('phone'), 32);
  const addressDetail = cleanText(formData.get('addressDetail'), 300);
  const primaryCaregiver = cleanText(formData.get('primaryCaregiver'), 120);
  const caregiverRelation = cleanText(formData.get('caregiverRelation'), 120);

  if (!phone) {
    redirect(`/${locale}/portal?error=missing-phone`);
  }

  await auditedPrisma.patient.update({
    where: { id: session.user.patientId },
    data: {
      phone,
      addressDetail,
      primaryCaregiver,
      caregiverRelation,
    },
  });

  // Keep patient credentials login (phone identifier) in sync.
  await prisma.user.updateMany({
    where: { patientId: session.user.patientId },
    data: { phone },
  });

  revalidatePath(`/${locale}/portal`);
  redirect(`/${locale}/portal?updated=profile`);
}

export async function submitVisitRequestAction(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== 'patient' || !session.user.patientId) {
    throw new Error('Unauthorized');
  }

  const locale = typeof formData.get('locale') === 'string' ? (formData.get('locale') as string) : 'en';
  const auditedPrisma = getAuditedPrisma(session.user.patientId ?? null);
  const visitId = cleanText(formData.get('visitId'), 64);
  const requestType = cleanText(formData.get('requestType'), 20) as VisitRequestType | null;
  const requestedDate = cleanText(formData.get('requestedDate'), 32);
  const requestNotes = cleanText(formData.get('requestNotes'), 500);

  if (!visitId || !requestType) {
    redirect(`/${locale}/portal?error=invalid-request`);
  }

  const visit = await prisma.visit.findFirst({
    where: {
      id: visitId,
      patientId: session.user.patientId,
    },
    select: {
      id: true,
      notes: true,
    },
  });

  if (!visit) {
    redirect(`/${locale}/portal?error=visit-not-found`);
  }

  const now = new Date();
  const parts = [`[PORTAL REQUEST ${now.toISOString()}] type=${requestType}`];
  if (requestedDate) parts.push(`preferred_date=${requestedDate}`);
  if (requestNotes) parts.push(`notes=${requestNotes}`);

  const appended = `${visit.notes ? `${visit.notes}\n` : ''}${parts.join(' | ')}`;

  await auditedPrisma.visit.update({
    where: { id: visit.id },
    data: { notes: appended },
  });

  revalidatePath(`/${locale}/portal`);
  redirect(`/${locale}/portal?updated=request-${requestType}`);
}
