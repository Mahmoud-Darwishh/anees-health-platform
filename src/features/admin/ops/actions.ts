'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { getStaffUser } from '@/lib/auth/rbac';
import { recordAudit } from '@/lib/utils/audit';
import { ensureMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { assignStaffToPatientCareTeam } from '@/lib/medplum/care-teams';
import { toCareTeamRole } from '@/features/ehr/admin-patient/helpers';
import { logger } from '@/lib/utils/app-logger';
import { createVisit, createVisitSeries, rescheduleVisit } from '@/lib/visits/create-visit';
import { notify } from '@/lib/notifications';
import { persistWorkflowStateTransition } from '@/features/ehr/admin-patient/actions/shared/workflow-state';
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

    // Tell the clinician they have a new assignment (push to their devices).
    // Best-effort and PHI-light — visit code only, no patient name.
    await notify(
      { staffId: staff.id },
      {
        title: 'New visit assigned',
        body: `You have been assigned visit ${visit.code}. Open your journey to review it.`,
        url: '/clinician/today',
      },
    );

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

// ─────────────────────────── Visit creation / scheduling ───────────────────

function parseScheduledDate(dateStr: string, timeStr: string): Date {
  // Interpret the ops-entered wall-clock as Africa/Cairo (UTC+2, no DST today).
  // Stored as an absolute instant; the "HH:mm" is also persisted verbatim.
  const time = /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : '09:00';
  const iso = `${dateStr}T${time}:00+02:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Enter a valid date and time.');
  }
  return d;
}

/**
 * Create a visit (or a whole package series) from the ops scheduling screen.
 * Resolves the patient by case ID within the dispatcher's tenant, then delegates
 * to the visit-creation service. Optionally assigns a clinician on creation.
 */
export async function createVisitAction(
  _prev: OpsActionState,
  formData: FormData,
): Promise<OpsActionState> {
  try {
    const dispatcher = await requireDispatcher();
    const tenantId = dispatcher.tenantId ?? 'platform';

    const patientCode = String(formData.get('patientCode') ?? '').trim();
    const serviceId = String(formData.get('serviceId') ?? '').trim();
    const dateStr = String(formData.get('scheduledDate') ?? '').trim();
    const timeStr = String(formData.get('scheduledTime') ?? '').trim();
    const visitType = String(formData.get('visitType') ?? 'in_home').trim() === 'telemedicine'
      ? 'telemedicine'
      : 'in_home';
    const staffId = String(formData.get('staffId') ?? '').trim();
    const isSeries = String(formData.get('isSeries') ?? '') === 'on';
    const sessionCount = Number.parseInt(String(formData.get('sessionCount') ?? '1'), 10) || 1;
    const cadenceDays = Number.parseInt(String(formData.get('cadenceDays') ?? '7'), 10) || 7;

    if (!patientCode || !serviceId || !dateStr) {
      return { status: 'error', message: 'Patient case ID, service, and date are required.' };
    }

    const patient = await prisma.patient.findFirst({
      where: { code: patientCode, tenantId, deletedAt: null },
      select: { id: true, code: true, fullName: true },
    });
    if (!patient) {
      return { status: 'error', message: `No patient found with case ID "${patientCode}" in this tenant.` };
    }

    // Optional clinician assignment on creation.
    let providerId: string | null = null;
    let assignedStaffId: string | null = null;
    if (staffId) {
      const staff = await prisma.staff.findFirst({
        where: { id: staffId, tenantId, status: 'active' },
        select: { id: true, providerId: true },
      });
      if (!staff?.providerId) {
        return { status: 'error', message: 'Selected clinician is not linked to a provider profile.' };
      }
      providerId = staff.providerId;
      assignedStaffId = staff.id;
    }

    const scheduledDate = parseScheduledDate(dateStr, timeStr);
    const bookedBy = `staff_${dispatcher.staffId}`;

    let resultMsg: string;
    if (isSeries && sessionCount > 1) {
      const service = await prisma.service.findFirst({ where: { id: serviceId }, select: { name: true } });
      const { visits } = await createVisitSeries({
        patientId: patient.id,
        serviceId,
        firstDate: scheduledDate,
        scheduledTime: timeStr || null,
        sessionCount,
        cadenceDays,
        visitType,
        providerId,
        tenantId,
        bookedBy,
        carePlan: { planName: service?.name ? `${service.name} — ${sessionCount}-session programme` : `${sessionCount}-session programme` },
      });
      resultMsg = `Created ${visits.length} visits for ${patient.fullName} (case ${patient.code}).`;
    } else {
      const visit = await createVisit({
        patientId: patient.id,
        serviceId,
        scheduledDate,
        scheduledTime: timeStr || null,
        visitType,
        providerId,
        tenantId,
        bookedBy,
      });
      resultMsg = `Created visit ${visit.code} for ${patient.fullName} (case ${patient.code}).`;
    }

    // Notify the clinician if one was assigned at creation time.
    if (assignedStaffId) {
      await notify(
        { staffId: assignedStaffId },
        { title: 'New visit assigned', body: 'A new visit has been scheduled for you.', url: '/clinician/today' },
      );
    }

    revalidatePath('/admin/ops');
    return { status: 'success', message: resultMsg };
  } catch (error) {
    return errorState(error);
  }
}

/** Move an open visit to a new date/time (non-punitive, no cancellation fee). */
export async function rescheduleVisitAction(
  _prev: OpsActionState,
  formData: FormData,
): Promise<OpsActionState> {
  try {
    const dispatcher = await requireDispatcher();
    const tenantId = dispatcher.tenantId ?? 'platform';

    const visitId = String(formData.get('visitId') ?? '').trim();
    const dateStr = String(formData.get('scheduledDate') ?? '').trim();
    const timeStr = String(formData.get('scheduledTime') ?? '').trim();
    const reason = String(formData.get('reason') ?? '').trim() || null;
    if (!visitId || !dateStr) {
      return { status: 'error', message: 'A visit and a new date are required.' };
    }

    const newDate = parseScheduledDate(dateStr, timeStr);
    const result = await rescheduleVisit({
      visitId,
      tenantId,
      newDate,
      newTime: timeStr || null,
      changedBy: `staff_${dispatcher.staffId}`,
      reason,
    });

    await recordAudit({
      tableName: 'visits',
      recordId: result.id,
      action: 'update',
      changedBy: `staff_${dispatcher.staffId}`,
      actorRole: dispatcher.staffRole ?? null,
      changedFields: { source: 'admin.ops.reschedule', to: newDate.toISOString() },
    });

    // Tell the patient their visit moved (best-effort WhatsApp), and the
    // assigned clinician if any.
    const visit = await prisma.visit.findUnique({
      where: { id: result.id },
      select: {
        patient: { select: { id: true, phone: true } },
        provider: { select: { linkedStaff: { select: { id: true } } } },
      },
    });
    if (visit?.patient?.phone) {
      await notify(
        { patientId: visit.patient.id },
        {
          title: 'Visit rescheduled',
          body: 'Your Anees visit has been rescheduled.',
          whatsappPhone: visit.patient.phone,
          whatsappText: `Your Anees Health visit has been rescheduled to ${dateStr}${timeStr ? ` at ${timeStr}` : ''}. Reply here if this does not work for you.`,
          channels: ['whatsapp'],
          url: '/portal?tab=visits',
        },
      );
    }
    if (visit?.provider?.linkedStaff?.id) {
      await notify(
        { staffId: visit.provider.linkedStaff.id },
        { title: 'Visit rescheduled', body: `Visit ${result.code} moved to ${dateStr}${timeStr ? ` ${timeStr}` : ''}.`, url: '/clinician/today' },
      );
    }

    revalidatePath('/admin/ops');
    return { status: 'success', message: `${result.code} rescheduled to ${dateStr}${timeStr ? ` at ${timeStr}` : ''}.` };
  } catch (error) {
    return errorState(error);
  }
}

// ─────────────────────────── Dispute resolution ────────────────────────────

/**
 * Resolve a disputed visit: either UPHOLD it (dispute rejected → the visit stands
 * as `completed`) or ADMIN FORCE-CLOSE it (`force_closed_by_admin`, terminal).
 * Both are real state-machine transitions written through the transition helper
 * so the ledger + audit stay authoritative. Force-close is a break-glass style
 * override and is audited as `action='override'`. Money is NOT auto-adjusted
 * here — any refund/payout clawback is a deliberate downstream finance action.
 */
export async function resolveDisputeAction(
  _prev: OpsActionState,
  formData: FormData,
): Promise<OpsActionState> {
  try {
    const dispatcher = await requireDispatcher();
    const tenantId = dispatcher.tenantId ?? 'platform';

    const visitId = String(formData.get('visitId') ?? '').trim();
    const resolution = String(formData.get('resolution') ?? '').trim();
    const reasonNote = String(formData.get('reasonNote') ?? '').trim() || null;
    if (!visitId || (resolution !== 'uphold' && resolution !== 'force_close')) {
      return { status: 'error', message: 'Pick a resolution (uphold or force-close).' };
    }
    if (resolution === 'force_close' && !reasonNote) {
      return { status: 'error', message: 'A reason is required to force-close a disputed visit.' };
    }

    const visit = await prisma.visit.findFirst({
      where: { id: visitId, tenantId },
      select: {
        id: true,
        code: true,
        state: true,
        status: true,
        acknowledgedAt: true,
        enRouteAt: true,
        arrivedAt: true,
        checkInAt: true,
        checkOutAt: true,
      },
    });
    if (!visit) {
      return { status: 'error', message: 'Visit not found in this tenant.' };
    }
    if (visit.state !== 'disputed') {
      return { status: 'error', message: `Visit ${visit.code} is not currently disputed (state: ${visit.state ?? visit.status}).` };
    }

    const isForceClose = resolution === 'force_close';
    const toState = isForceClose ? 'force_closed_by_admin' : 'completed';

    await persistWorkflowStateTransition({
      visit: {
        id: visit.id,
        status: visit.status,
        acknowledgedAt: visit.acknowledgedAt,
        enRouteAt: visit.enRouteAt,
        arrivedAt: visit.arrivedAt,
        checkInAt: visit.checkInAt,
        checkOutAt: visit.checkOutAt,
      },
      toState,
      changedBy: `staff_${dispatcher.staffId}`,
      reasonNote,
      isOverride: isForceClose,
      overrideMethod: isForceClose ? 'admin_force_close' : null,
    });

    await recordAudit(
      {
        tableName: 'visits',
        recordId: visit.id,
        action: isForceClose ? 'override' : 'update',
        changedBy: `staff_${dispatcher.staffId}`,
        actorRole: dispatcher.staffRole ?? null,
        changedFields: {
          source: 'admin.ops.resolve_dispute',
          resolution,
          toState,
          reason: reasonNote,
        },
      },
      { critical: isForceClose },
    );

    revalidatePath('/admin/ops/disputes');
    revalidatePath('/admin/ops');
    return {
      status: 'success',
      message: isForceClose
        ? `${visit.code} force-closed by admin.`
        : `${visit.code} dispute rejected — visit upheld as completed.`,
    };
  } catch (error) {
    return errorState(error);
  }
}
