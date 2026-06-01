import 'server-only';

import { prisma } from '@/lib/db/prisma';
import { getSessionUser } from '@/lib/auth/rbac';
import { getMedplumPatient } from '@/lib/medplum/patients';
import { resolvePortalConsentForCaregiver, type PortalScope } from '@/lib/medplum/consents';

type PortalAccess = {
  mode: 'patient' | 'caregiver';
  scopes: PortalScope[];
  consentId?: string;
};

const PATIENT_FULL_SCOPES: PortalScope[] = ['profile', 'visits', 'vitals', 'notes', 'tasks'];

/**
 * Resolves the clinical record for the CURRENTLY LOGGED-IN patient only.
 *
 * This is the single entry point the patient portal must use to read records.
 * It derives the patient from the session — never from a client-supplied id —
 * so a patient can structurally never read another patient's data. 
 */
export async function getOwnPatientRecord() {
  const user = await getSessionUser();
  if (!user || user.role !== 'patient') return null;

  let patientId: string | null = user.patientId ?? null;
  let access: PortalAccess | null = patientId
    ? { mode: 'patient', scopes: [...PATIENT_FULL_SCOPES] }
    : null;

  if (!patientId) {
    const caregiverPhone = user.phone ?? null;
    const caregiverEmail = user.email ?? null;

    if (!caregiverPhone && !caregiverEmail) {
      return null;
    }

    const linkedPatients = await prisma.patient.findMany({
      where: {
        deletedAt: null,
        OR: [
          caregiverPhone ? { primaryCaregiverPhone: caregiverPhone } : undefined,
          caregiverPhone ? { primaryCaregiverWhatsapp: caregiverPhone } : undefined,
          caregiverEmail ? { primaryCaregiverEmail: caregiverEmail } : undefined,
        ].filter((item): item is NonNullable<typeof item> => !!item),
      },
      select: {
        id: true,
        medplumPatientId: true,
      },
      take: 2,
    });

    // Safety first: ambiguous caregiver identity cannot be auto-bound to one case.
    if (linkedPatients.length !== 1) {
      return null;
    }

    const linkedPatient = linkedPatients[0];
    if (!linkedPatient.medplumPatientId) {
      return null;
    }

    const consent = await resolvePortalConsentForCaregiver(linkedPatient.medplumPatientId, {
      phone: caregiverPhone,
      email: caregiverEmail,
    });

    if (!consent) {
      return null;
    }

    patientId = linkedPatient.id;
    access = {
      mode: 'caregiver',
      scopes: consent.scopes,
      consentId: consent.consentId,
    };
  }

  if (!patientId || !access) {
    return null;
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, deletedAt: null },
    select: {
      id: true,
      code: true,
      fullName: true,
      arabicName: true,
      phone: true,
      gender: true,
      dateOfBirth: true,
      status: true,
      medplumPatientId: true,
      addressDetail: true,
      landmark: true,
      addressMapUrl: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      emergencyContactRelation: true,
    },
  });

  if (!patient) return null;

  const medplumPatient = patient.medplumPatientId
    ? await getMedplumPatient(patient.medplumPatientId).catch(() => null)
    : null;

  return { patient, medplumPatient, access };
}
