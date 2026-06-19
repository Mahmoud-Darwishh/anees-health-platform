'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { ZodError } from 'zod';
import type { LicenseType, StaffRole } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { recordAudit } from '@/lib/utils/audit';
import { hashPassword, unusablePasswordHash } from '@/lib/auth/password';
import { issueAccountToken, resolveAccountToken } from '@/lib/auth/account-tokens';
import { passwordSchema } from '@/lib/auth/password-rules';
import { ensureProviderForStaff } from '@/lib/staff/ensure-provider-for-staff';
import {
  createStaffSchema,
  updateStaffSchema,
  setStaffStatusSchema,
  issueCredentialLinkSchema,
} from './schemas';
import type { StaffActionState } from './types';

// ── internal helpers ─────────────────────────────────────────────────────────

function readStaffForm(formData: FormData): Record<string, unknown> {
  const str = (key: string) => {
    const value = formData.get(key);
    return typeof value === 'string' ? value : undefined;
  };
  const bool = (key: string) => {
    const value = formData.get(key);
    return value === 'on' || value === 'true';
  };
  return {
    staffId: str('staffId'),
    name: str('name'),
    email: str('email'),
    role: str('role'),
    clinicalLicenseType: str('clinicalLicenseType'),
    clinicalLicenseNumber: str('clinicalLicenseNumber'),
    clinicalLicenseExpiry: str('clinicalLicenseExpiry'),
    licenseIssuingBody: str('licenseIssuingBody'),
    isOnCall: bool('isOnCall'),
    isClinicalDirector: bool('isClinicalDirector'),
    publicDoctorId: str('publicDoctorId'),
  };
}

function errorState(error: unknown): StaffActionState {
  if (error instanceof ZodError) {
    return { status: 'error', message: error.issues[0]?.message ?? 'Please check the form and try again.' };
  }
  if (error instanceof Error && error.message === 'Unauthorized') {
    return { status: 'error', message: 'You do not have permission to manage staff.' };
  }
  return { status: 'error', message: error instanceof Error ? error.message : 'Unexpected error. Please try again.' };
}

async function resolveOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (configured) {
    return configured;
  }
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? 'https';
  return host ? `${proto}://${host}` : '';
}

async function buildCredentialLink(staffId: string): Promise<string> {
  const raw = await issueAccountToken('staff_invite', staffId);
  const origin = await resolveOrigin();
  return `${origin}/admin/set-password?token=${encodeURIComponent(raw)}`;
}

function toExpiryDate(value?: string): Date | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const auditActor = (user: { staffId: string; staffRole?: StaffRole | null }) => ({
  changedBy: `staff_${user.staffId}`,
  actorRole: user.staffRole ?? null,
});

// ── actions ──────────────────────────────────────────────────────────────────

export async function createStaffAction(_prev: StaffActionState, formData: FormData): Promise<StaffActionState> {
  try {
    const { user, actor } = await requireStaffCan('staff.create');
    const input = createStaffSchema.parse(readStaffForm(formData));

    const existing = await prisma.staff.findUnique({ where: { email: input.email }, select: { id: true } });
    if (existing) {
      return { status: 'error', message: 'A staff member with this email already exists.' };
    }

    const placeholderHash = await unusablePasswordHash();
    const staff = await prisma.staff.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: placeholderHash,
        role: input.role as StaffRole,
        status: 'active',
        clinicalLicenseType: (input.clinicalLicenseType as LicenseType | undefined) ?? null,
        clinicalLicenseNumber: input.clinicalLicenseNumber ?? null,
        clinicalLicenseExpiry: toExpiryDate(input.clinicalLicenseExpiry),
        licenseIssuingBody: input.licenseIssuingBody ?? null,
        isOnCall: input.isOnCall,
        isClinicalDirector: input.isClinicalDirector,
        publicDoctorId: input.publicDoctorId ?? null,
        tenantId: actor.tenantId,
      },
      select: { id: true, name: true },
    });

    await recordAudit(
      {
        tableName: 'staff',
        recordId: staff.id,
        action: 'create',
        ...auditActor(user),
        changedFields: {
          fields: ['name', 'email', 'role', 'status', 'clinicalLicenseType', 'clinicalLicenseExpiry', 'tenantId'],
          role: input.role,
          licenseType: input.clinicalLicenseType ?? null,
        },
      },
      { critical: true },
    );

    // Link a Provider profile for field clinicians so they're immediately
    // assignable on the dispatch board + visible in their "today" view. No-op
    // for non-clinical roles; best-effort (never blocks onboarding).
    await ensureProviderForStaff(staff.id, `staff_${user.staffId}`);

    const inviteUrl = await buildCredentialLink(staff.id);
    revalidatePath('/admin/staff');

    return {
      status: 'success',
      message: `${staff.name} was created. Share the one-time access link below — it lets them set their own password.`,
      inviteUrl,
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function updateStaffAction(_prev: StaffActionState, formData: FormData): Promise<StaffActionState> {
  try {
    const { user, actor } = await requireStaffCan('staff.update');
    const input = updateStaffSchema.parse(readStaffForm(formData));

    const current = await prisma.staff.findFirst({
      where: { id: input.staffId, tenantId: actor.tenantId },
      select: { id: true, email: true, role: true },
    });
    if (!current) {
      return { status: 'error', message: 'Staff member not found.' };
    }

    if (input.email !== current.email) {
      const clash = await prisma.staff.findUnique({ where: { email: input.email }, select: { id: true } });
      if (clash && clash.id !== current.id) {
        return { status: 'error', message: 'Another staff member already uses this email.' };
      }
    }

    await prisma.staff.update({
      where: { id: current.id },
      data: {
        name: input.name,
        email: input.email,
        role: input.role as StaffRole,
        clinicalLicenseType: (input.clinicalLicenseType as LicenseType | undefined) ?? null,
        clinicalLicenseNumber: input.clinicalLicenseNumber ?? null,
        clinicalLicenseExpiry: toExpiryDate(input.clinicalLicenseExpiry),
        licenseIssuingBody: input.licenseIssuingBody ?? null,
        isOnCall: input.isOnCall,
        isClinicalDirector: input.isClinicalDirector,
        publicDoctorId: input.publicDoctorId ?? null,
      },
    });

    const roleChanged = current.role !== input.role;
    await recordAudit(
      {
        tableName: 'staff',
        recordId: current.id,
        action: 'update',
        ...auditActor(user),
        changedFields: roleChanged
          ? {
              fields: ['name', 'email', 'role', 'clinicalLicenseType', 'clinicalLicenseExpiry', 'isOnCall', 'isClinicalDirector'],
              roleChanged: true,
              previousRole: current.role,
              newRole: input.role,
            }
          : {
              fields: ['name', 'email', 'clinicalLicenseType', 'clinicalLicenseExpiry', 'isOnCall', 'isClinicalDirector'],
              roleChanged: false,
            },
      },
      { critical: true },
    );

    // Backfill / maintain the Provider link when a clinician is saved (e.g. a
    // role change into a clinical discipline, or an existing clinician who
    // predates auto-linking). No-op if already linked or non-clinical.
    await ensureProviderForStaff(current.id, `staff_${user.staffId}`);

    revalidatePath('/admin/staff');
    revalidatePath(`/admin/staff/${current.id}`);
    return { status: 'success', message: 'Staff member updated.' };
  } catch (error) {
    return errorState(error);
  }
}

export async function setStaffStatusAction(_prev: StaffActionState, formData: FormData): Promise<StaffActionState> {
  try {
    const { user, actor } = await requireStaffCan('staff.set_status');
    const input = setStaffStatusSchema.parse({
      staffId: formData.get('staffId'),
      status: formData.get('status'),
    });

    // Guard against self-lockout: an admin cannot suspend/deactivate their own
    // account (which would also evict their session on next request).
    if (input.staffId === user.staffId && input.status !== 'active') {
      return { status: 'error', message: 'You cannot deactivate or suspend your own account.' };
    }

    const current = await prisma.staff.findFirst({
      where: { id: input.staffId, tenantId: actor.tenantId },
      select: { id: true, status: true, name: true },
    });
    if (!current) {
      return { status: 'error', message: 'Staff member not found.' };
    }

    await prisma.staff.update({ where: { id: current.id }, data: { status: input.status } });

    await recordAudit(
      {
        tableName: 'staff',
        recordId: current.id,
        action: 'update',
        ...auditActor(user),
        changedFields: { field: 'status', from: current.status, to: input.status },
      },
      { critical: true },
    );

    revalidatePath('/admin/staff');
    revalidatePath(`/admin/staff/${current.id}`);
    return { status: 'success', message: `${current.name} is now ${input.status}.` };
  } catch (error) {
    return errorState(error);
  }
}

/**
 * Re-issue a one-time set-password link (e.g. invite expired, or a password
 * reset requested out-of-band). Admin-issued and conveyed by the admin to the
 * staff member — there is no public self-service reset for staff yet.
 */
export async function reissueCredentialLinkAction(
  _prev: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  try {
    const { user, actor } = await requireStaffCan('staff.issue_credential_link');
    const input = issueCredentialLinkSchema.parse({ staffId: formData.get('staffId') });

    const current = await prisma.staff.findFirst({
      where: { id: input.staffId, tenantId: actor.tenantId },
      select: { id: true, name: true },
    });
    if (!current) {
      return { status: 'error', message: 'Staff member not found.' };
    }

    await recordAudit(
      {
        tableName: 'staff',
        recordId: current.id,
        action: 'update',
        ...auditActor(user),
        changedFields: { event: 'credential_link_issued' },
      },
      { critical: true },
    );

    const inviteUrl = await buildCredentialLink(current.id);
    return {
      status: 'success',
      message: `New one-time access link for ${current.name}. Any previous link is now void.`,
      inviteUrl,
    };
  } catch (error) {
    return errorState(error);
  }
}

/**
 * PUBLIC action (no session) — the invite token IS the authorization. Consumes
 * the single-use token and sets the staff member's password.
 */
export async function setStaffPasswordAction(
  _prev: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  try {
    const token = String(formData.get('token') ?? '');
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (password !== confirmPassword) {
      return { status: 'error', message: 'The two passwords do not match.' };
    }
    passwordSchema.parse(password);

    const resolved = await resolveAccountToken('staff_invite', token, { consume: true });
    if (!resolved) {
      return {
        status: 'error',
        message: 'This link is invalid or has expired. Ask an administrator to send you a new one.',
      };
    }

    const staff = await prisma.staff.findUnique({ where: { id: resolved.subjectId }, select: { id: true } });
    if (!staff) {
      return { status: 'error', message: 'This account no longer exists. Contact your administrator.' };
    }

    const passwordHash = await hashPassword(password);
    await prisma.staff.update({ where: { id: staff.id }, data: { passwordHash } });

    await recordAudit(
      {
        tableName: 'staff',
        recordId: staff.id,
        action: 'update',
        changedBy: `staff_${staff.id}`,
        changedFields: { field: 'passwordHash', via: 'invite_set_password' },
      },
      { critical: true },
    );

    return { status: 'success', message: 'Your password is set. You can now sign in.' };
  } catch (error) {
    return errorState(error);
  }
}
