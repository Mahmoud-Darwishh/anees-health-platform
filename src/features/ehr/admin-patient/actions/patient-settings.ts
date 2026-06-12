'use server';

import { AuditAction } from '@prisma/client';
import { upsertCaregiverPortalConsent } from '@/lib/medplum/consents';
import { updateMedplumPatientDemographics } from '@/lib/medplum/patients';
import { writeMedplumAuditMirror } from '@/lib/medplum/audit';
import { prisma } from '@/lib/db/prisma';
import { updatePatientGeoPolicySchema, formDataToInput, updatePatientDemographicsSchema, upsertCaregiverConsentSchema } from '@/features/ehr/schemas/admin-patient-actions';
import { canEditDemographics } from '../role-scope';
import { setAdminPatientFlash } from '../flash';
import { refreshClinicalPaths, failAction, requireAdminPatientAction, getClinicalWriterWithPractitioner, getCoordinationWriterWithPractitioner } from './shared';

export async function updatePatientGeoPolicyAction(formData: FormData): Promise<void> {
  try {
    const { staff, changedBy } = await getCoordinationWriterWithPractitioner();
    if (!canEditDemographics(staff.staffRole ?? null)) {
      throw new Error('Only admin/medical-ops roles can update geofence policy.');
    }

    const input = updatePatientGeoPolicySchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('patient.demographics.update', input.medplumPatientId, 'patients');

    await prisma.patient.updateMany({
      where: { medplumPatientId: input.medplumPatientId },
      data: {
        handoffGeofenceRadiusMeters: input.handoffGeofenceRadiusMeters ?? null,
        temporarilyAwayUntil: input.temporarilyAwayUntil ?? null,
        temporarilyAwayNote: input.temporarilyAwayNote ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        tableName: 'patients',
        recordId: input.medplumPatientId,
        action: AuditAction.update,
        changedFields: ['handoffGeofenceRadiusMeters', 'temporarilyAwayUntil', 'temporarilyAwayNote'],
        changedBy,
      },
    });

    await writeMedplumAuditMirror({
      tableName: 'PatientGeoPolicy',
      recordId: input.medplumPatientId,
      action: AuditAction.update,
      changedFields: ['handoffGeofenceRadiusMeters', 'temporarilyAwayUntil', 'temporarilyAwayNote'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Patient geofence policy saved.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function upsertCaregiverConsentAction(formData: FormData): Promise<void> {
  try {
    const { changedBy } = await getClinicalWriterWithPractitioner();
    const input = upsertCaregiverConsentSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('consent.write', input.medplumPatientId, 'consents');

    const consent = await upsertCaregiverPortalConsent({
      patientMedplumId: input.medplumPatientId,
      consentId: input.consentId,
      expectedVersionId: input.consentVersionId,
      decision: input.decision,
      identity: {
        phone: input.caregiverPhone,
        email: input.caregiverEmail,
      },
      scopes: input.scopes,
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumConsent',
      recordId: consent.id,
      action: AuditAction.update,
      changedFields: ['provision.type', 'extension.portalScope', 'extension.caregiverIdentity', 'status'],
      changedBy,
    });

    await setAdminPatientFlash({ type: 'success', message: 'Caregiver portal consent saved.' });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}

export async function updatePatientDemographicsAction(formData: FormData): Promise<void> {
  try {
    const { staff, changedBy } = await getClinicalWriterWithPractitioner();
    if (!canEditDemographics(staff.staffRole ?? null)) {
      throw new Error('Your role has read-only access to patient demographics.');
    }
    const demographicSection = String(formData.get('demographicSection') ?? '').trim();
    const input = updatePatientDemographicsSchema.parse(formDataToInput(formData));
    await requireAdminPatientAction('patient.demographics.update', input.medplumPatientId, 'patients');

    const patient = await updateMedplumPatientDemographics({
      patientId: input.medplumPatientId,
      expectedVersionId: input.patientVersionId,
      addressDetail: input.addressDetail ?? null,
      landmark: input.landmark ?? null,
      addressMapUrl: input.addressMapUrl ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      emergencyContactRelation: input.emergencyContactRelation ?? null,
      secondaryEmergencyContactName: input.secondaryEmergencyContactName ?? null,
      secondaryEmergencyContactPhone: input.secondaryEmergencyContactPhone ?? null,
      secondaryEmergencyContactRelation: input.secondaryEmergencyContactRelation ?? null,
    });

    await prisma.patient.updateMany({
      where: { medplumPatientId: input.medplumPatientId },
      data: {
        addressDetail: input.addressDetail ?? null,
        landmark: input.landmark ?? null,
        addressMapUrl: input.addressMapUrl ?? null,
        emergencyContactName: input.emergencyContactName ?? null,
        emergencyContactPhone: input.emergencyContactPhone ?? null,
        emergencyContactRelation: input.emergencyContactRelation ?? null,
        // secondaryEmergency* fields are stored only in Medplum (FHIR contact[1]) — no Postgres columns.
      },
    });

    await prisma.auditLog.create({
      data: {
        tableName: 'patients',
        recordId: input.medplumPatientId,
        action: AuditAction.update,
        changedFields: [
          'addressDetail',
          'landmark',
          'addressMapUrl',
          'emergencyContactName',
          'emergencyContactPhone',
          'emergencyContactRelation',
          // secondaryEmergency* stored in Medplum only, audited by writeMedplumAuditMirror.
        ],
        changedBy,
      },
    });

    await writeMedplumAuditMirror({
      tableName: 'MedplumPatient',
      recordId: patient.id ?? input.medplumPatientId,
      action: AuditAction.update,
      changedFields: ['address', 'address.extension.address-map-url'],
      changedBy,
    });

    await setAdminPatientFlash({
      type: 'success',
      message:
        demographicSection === 'residence'
          ? 'Patient address saved.'
          : demographicSection === 'emergency'
            ? 'Emergency contact saved.'
            : 'Patient demographics saved.',
    });
    refreshClinicalPaths(input.medplumPatientId);
  } catch (error) {
    await failAction(formData, error);
  }
}
