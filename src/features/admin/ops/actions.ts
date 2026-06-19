'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { getStaffUser } from '@/lib/auth/rbac';
import { recordAudit } from '@/lib/utils/audit';
import { ensureMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { assignStaffToPatientCareTeam } from '@/lib/medplum/care-teams';
import { toCareTeamRole } from '@/features/ehr/admin-patient/helpers';
import { logger } from '@/lib/utils/app-logger';
import { DISPATCH_ROLES, type OpsActionState } from './types';

async function requireDispatcher() {
  const staff = await getStaffUser([...DISPATCH_ROLES]);
  if (!staff?.staffId) {
    throw new Error('UNAUTHORIZED');
  }
  return staff;
}

function errorState(error: unknown): OpsActionState {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return { status: 'error', message: 'You are not authorised to dispatch visits.' };
  }
  return { status: 'error', message: error instanceof Error ? error.message : 'Unexpected error. Please try again.' };
}

/**
 * Assign (or reassign) a clinician to a visit. Sets the visit's provider AND
 * adds the clinician to the patient's FHIR CareTeam (best-effort) so case-scoped
 * clinical access works. Audited.
 */
export async function assignVisitClinicianAction(
  _prev: OpsActionState,
  formData: FormData,
): Promise<OpsActionState> {
  try {
    const dispatcher = await requireDispatcher();
    const visitId = String(formData.get('visitId') ?? '').trim();
    const staffId = String(formData.get('staffId') ?? '').trim();
    if (!visitId || !staffId) {
      return { status: 'error', message: 'Select a clinician to assign.' };
    }

    const tenantId = dispatcher.tenantId ?? 'platform';

    const visit = await prisma.visit.findFirst({
      where: { id: visitId, tenantId },
      select: { id: true, code: true, patient: { select: { id: true, medplumPatientId: true } } },
    });
    if (!visit) {
      return { status: 'error', message: 'Visit not found.' };
    }

    const staff = await prisma.staff.findFirst({
      where: { id: staffId, tenantId, status: 'active' },
      select: { id: true, name: true, email: true, role: true, providerId: true },
    });
    if (!staff) {
      return { status: 'error', message: 'Clinician not found or inactive.' };
    }
    if (!staff.providerId) {
      return { status: 'error', message: `${staff.name} is not linked to a provider profile yet — ask an admin to link it.` };
    }

    await prisma.visit.update({ where: { id: visit.id }, data: { providerId: staff.providerId } });

    await recordAudit({
      tableName: 'visits',
      recordId: visit.id,
      action: 'update',
      changedBy: `staff_${dispatcher.staffId}`,
      actorRole: dispatcher.staffRole ?? null,
      changedFields: { source: 'admin.ops.assign_clinician', field: 'providerId', assignedStaffId: staff.id },
    });

    // Add the clinician to the patient's CareTeam so case-scoped access works.
    // Best-effort — a Medplum hiccup must not undo the operational assignment.
    if (visit.patient.medplumPatientId) {
      const roleCode = toCareTeamRole(staff.role);
      if (roleCode) {
        try {
          const practitioner = await ensureMedplumPractitionerForStaff({
            staffId: staff.id,
            name: staff.name,
            email: staff.email,
            role: staff.role,
          });
          await assignStaffToPatientCareTeam(visit.patient.medplumPatientId, {
            practitionerReference: practitioner.reference,
            display: staff.name,
            roleCode,
          });
        } catch (error) {
          logger.error('assignVisitClinician: CareTeam sync failed', {
            visitId: visit.id,
            error: error instanceof Error ? error.message : 'unknown',
          });
        }
      }
    }

    revalidatePath('/admin/ops');
    return { status: 'success', message: `${staff.name} assigned to ${visit.code}.` };
  } catch (error) {
    return errorState(error);
  }
}
