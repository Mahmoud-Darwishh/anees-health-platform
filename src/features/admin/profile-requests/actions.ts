'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { getStaffUser } from '@/lib/auth/rbac';
import { recordAudit } from '@/lib/utils/audit';
import { logger } from '@/lib/utils/app-logger';
import { PROFILE_REVIEW_ROLES, PROFILE_SUBMIT_ROLES, type ProfileActionState } from './types';

function clip(value: FormDataEntryValue | null, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function errorState(error: unknown): ProfileActionState {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    return { status: 'error', message: 'You are not authorised for this action.' };
  }
  return { status: 'error', message: error instanceof Error ? error.message : 'Unexpected error. Please try again.' };
}

/** A clinician proposes public-profile content. Creates a pending request. */
export async function submitProfileChangeRequestAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    const staff = await getStaffUser([...PROFILE_SUBMIT_ROLES]);
    if (!staff?.staffId) {
      throw new Error('UNAUTHORIZED');
    }

    const headline = clip(formData.get('headline'), 160);
    const bioEn = clip(formData.get('bioEn'), 2000);
    const bioAr = clip(formData.get('bioAr'), 2000);
    const specialties = clip(formData.get('specialties'), 400);
    const languages = clip(formData.get('languages'), 200);
    const photoUrl = clip(formData.get('photoUrl'), 500);

    if (!headline && !bioEn && !bioAr && !specialties && !languages && !photoUrl) {
      return { status: 'error', message: 'Add at least one field before submitting.' };
    }
    if (photoUrl && !/^https:\/\//i.test(photoUrl)) {
      return { status: 'error', message: 'Photo URL must be a secure https:// link.' };
    }

    const created = await prisma.profileChangeRequest.create({
      data: {
        staffId: staff.staffId,
        headline,
        bioEn,
        bioAr,
        specialties,
        languages,
        photoUrl,
        status: 'pending',
        tenantId: staff.tenantId ?? 'platform',
      },
      select: { id: true },
    });

    await recordAudit({
      tableName: 'profile_change_requests',
      recordId: created.id,
      action: 'create',
      changedBy: `staff_${staff.staffId}`,
      actorRole: staff.staffRole ?? null,
      changedFields: { source: 'clinician.profile.submit' },
    });

    revalidatePath('/admin/staff/profile-requests');
    return { status: 'success', message: 'Submitted for review. An administrator will approve your public profile.' };
  } catch (error) {
    return errorState(error);
  }
}

async function requireReviewer() {
  const staff = await getStaffUser([...PROFILE_REVIEW_ROLES]);
  if (!staff?.staffId) {
    throw new Error('UNAUTHORIZED');
  }
  return staff;
}

async function review(formData: FormData, decision: 'approved' | 'rejected'): Promise<ProfileActionState> {
  const reviewer = await requireReviewer();
  const requestId = String(formData.get('requestId') ?? '').trim();
  const note = clip(formData.get('reviewNote'), 500);
  if (!requestId) {
    return { status: 'error', message: 'Missing request id.' };
  }

  const request = await prisma.profileChangeRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      status: true,
      tenantId: true,
      staffId: true,
      headline: true,
      bioEn: true,
      bioAr: true,
      languages: true,
    },
  });
  if (!request) {
    return { status: 'error', message: 'Request not found.' };
  }
  if (request.tenantId !== (reviewer.tenantId ?? 'platform')) {
    return { status: 'error', message: 'This request belongs to a different tenant.' };
  }
  if (request.status !== 'pending') {
    return { status: 'error', message: 'This request has already been reviewed.' };
  }

  await prisma.profileChangeRequest.update({
    where: { id: requestId },
    data: { status: decision, reviewedByStaffId: reviewer.staffId, reviewNote: note, reviewedAt: new Date() },
  });

  await recordAudit({
    tableName: 'profile_change_requests',
    recordId: requestId,
    action: 'update',
    changedBy: `staff_${reviewer.staffId}`,
    actorRole: reviewer.staffRole ?? null,
    changedFields: { source: 'admin.profile.review', decision },
  });

  // On approval, publish the text fields to the clinician's linked public Doctor
  // profile (bio + headline + languages). Photo + specialities are intentionally
  // NOT auto-published (Doctor.image uses committed static assets; speciality is
  // a constrained filterable category). Best-effort — never fails the approval.
  let publishedNote = '';
  if (decision === 'approved') {
    try {
      const staff = await prisma.staff.findUnique({
        where: { id: request.staffId },
        select: { publicDoctorId: true },
      });
      if (!staff?.publicDoctorId) {
        publishedNote = ' Not linked to a public profile, so nothing was published — set the link in Staff to publish.';
      } else {
        const data: { bioEn?: string; bioAr?: string; professionalTitleEn?: string; languages?: string[] } = {};
        if (request.bioEn) data.bioEn = request.bioEn;
        if (request.bioAr) data.bioAr = request.bioAr;
        if (request.headline) data.professionalTitleEn = request.headline;
        if (request.languages) {
          const langs = request.languages.split(',').map((l) => l.trim()).filter(Boolean);
          if (langs.length > 0) data.languages = langs;
        }
        if (Object.keys(data).length > 0) {
          await prisma.doctor.update({ where: { id: staff.publicDoctorId }, data });
          await recordAudit({
            tableName: 'doctors',
            recordId: String(staff.publicDoctorId),
            action: 'update',
            changedBy: `staff_${reviewer.staffId}`,
            actorRole: reviewer.staffRole ?? null,
            changedFields: { source: 'admin.profile.publish', fields: Object.keys(data) },
          });
          // Public doctor pages are now statically/ISR cached; this change goes
          // live on the next revalidate window (getDoctors TTL / page revalidate).
          // TODO(cache): for instant publish, wire Next 16's revalidateTag(tag,
          // profile) once its interop with unstable_cache tags is confirmed.
          publishedNote = ' Published to the public profile.';
        }
      }
    } catch (error) {
      logger.error('profile publish failed', {
        requestId,
        error: error instanceof Error ? error.message : 'unknown',
      });
      publishedNote = ' Approved, but publishing to the public profile failed — retry or publish manually.';
    }
  }

  revalidatePath('/admin/staff/profile-requests');
  return { status: 'success', message: (decision === 'approved' ? 'Approved.' : 'Rejected.') + publishedNote };
}

export async function approveProfileChangeRequestAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    return await review(formData, 'approved');
  } catch (error) {
    return errorState(error);
  }
}

export async function rejectProfileChangeRequestAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  try {
    return await review(formData, 'rejected');
  } catch (error) {
    return errorState(error);
  }
}
