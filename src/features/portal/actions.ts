'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { getOwnPatientRecord } from '@/lib/portal/patient-record';
import { recordAudit } from '@/lib/utils/audit';
import { notifyStaffByRoles } from '@/lib/notifications';
import { logger } from '@/lib/utils/app-logger';

/**
 * PORTAL SELF-SERVICE VISIT REQUESTS.
 * -----------------------------------
 * Patients (and consented caregivers with the `visits` scope) can REQUEST a
 * reschedule or cancellation of an upcoming visit. This is deliberately a
 * REQUEST, not a mutation: it never touches the visit state machine, money, or
 * the schedule. It flags the visit for the ops desk (a durable `[PORTAL_REQUEST_PENDING]`
 * marker + a push to dispatch) and audits the ask. Ops then action it from the
 * dispatch board (reschedule / cancel via the proper transition helpers).
 *
 * The patient is ALWAYS resolved from the session (`getOwnPatientRecord`) — the
 * visit id from the form is verified to belong to that patient before anything
 * is written. A client-supplied patient id is never trusted.
 */

export type PortalRequestState = {
  status: 'idle' | 'success' | 'error';
  message: string;
};

export const idlePortalRequestState: PortalRequestState = { status: 'idle', message: '' };

const PENDING_MARKER = '[PORTAL_REQUEST_PENDING]';
const DISPATCH_ROLES = ['superadmin', 'admin', 'medical_ops', 'operator'] as const;

export async function requestVisitChangeAction(
  _prev: PortalRequestState,
  formData: FormData,
): Promise<PortalRequestState> {
  try {
    const record = await getOwnPatientRecord();
    if (!record) {
      return { status: 'error', message: 'Your session has expired. Please sign in again.' };
    }

    // Only the patient themselves, or a caregiver granted the `visits` scope,
    // may request schedule changes.
    const canRequest =
      record.access.mode === 'patient' || record.access.scopes.includes('visits');
    if (!canRequest) {
      return { status: 'error', message: 'You do not have permission to request visit changes.' };
    }

    const visitId = String(formData.get('visitId') ?? '').trim();
    const requestType = String(formData.get('requestType') ?? '').trim();
    const preferredDate = String(formData.get('preferredDate') ?? '').trim() || null;
    const note = String(formData.get('note') ?? '').trim() || null;

    if (!visitId || (requestType !== 'reschedule' && requestType !== 'cancel')) {
      return { status: 'error', message: 'Choose whether to reschedule or cancel.' };
    }

    const visit = await prisma.visit.findFirst({
      where: {
        id: visitId,
        patientId: record.patient.id,
        status: { in: ['scheduled', 'in_progress', 'rescheduled'] },
      },
      select: { id: true, code: true, notes: true, tenantId: true },
    });
    if (!visit) {
      return { status: 'error', message: 'That visit could not be found or is no longer changeable.' };
    }

    if ((visit.notes ?? '').includes(PENDING_MARKER)) {
      return { status: 'success', message: 'A request for this visit is already with our team.' };
    }

    // Durable, ops-visible marker. Kept terse; the free-text reason is stored in
    // Postgres notes (never logged).
    const markerLine = `${PENDING_MARKER} ${requestType}${preferredDate ? ` → ${preferredDate}` : ''}${note ? ` — ${note}` : ''}`;
    const nextNotes = visit.notes ? `${visit.notes}\n${markerLine}` : markerLine;

    await prisma.visit.updateMany({
      where: { id: visit.id, tenantId: visit.tenantId, patientId: record.patient.id },
      data: { notes: nextNotes },
    });

    await recordAudit({
      tableName: 'visits',
      recordId: visit.id,
      action: 'update',
      changedBy: `patient_${record.patient.id}`,
      changedFields: { source: 'portal.visit_change_request', requestType, hasPreferredDate: Boolean(preferredDate) },
    });

    // Alert the dispatch desk (PHI-light: visit code + request type only).
    await notifyStaffByRoles(visit.tenantId, [...DISPATCH_ROLES], {
      title: 'Patient visit request',
      body: `A patient requested to ${requestType} visit ${visit.code}.`,
      url: '/admin/ops',
    });

    revalidatePath('/[locale]/portal', 'page');
    return {
      status: 'success',
      message:
        requestType === 'cancel'
          ? 'Your cancellation request has been sent to our team.'
          : 'Your reschedule request has been sent to our team.',
    };
  } catch (error) {
    logger.error('[portal] requestVisitChange failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { status: 'error', message: 'Something went wrong. Please try again.' };
  }
}
