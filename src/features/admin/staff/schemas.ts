import { z } from 'zod';

/**
 * Mirrors the Prisma `StaffRole` enum. Kept as a local literal tuple so this
 * module stays import-light (no `@prisma/client` value import on the client).
 */
export const STAFF_ROLE_VALUES = [
  'superadmin',
  'admin',
  'medical_ops',
  'operator',
  'doctor',
  'physiotherapist',
  'nurse',
  'insurance_coordinator',
  'compliance_officer',
  'hospital_partner_admin',
  'finance',
  'viewer',
] as const;

/** Mirrors the Prisma `LicenseType` enum. */
export const LICENSE_TYPE_VALUES = [
  'medical_syndicate',
  'nursing_syndicate',
  'physiotherapy_syndicate',
  'pharmacy_syndicate',
  'none',
] as const;

export const STAFF_STATUS_VALUES = ['active', 'inactive', 'suspended'] as const;

/** Roles that legally REQUIRE a matching, non-expired syndicate licence. */
export const REQUIRED_LICENSE_BY_ROLE: Partial<Record<(typeof STAFF_ROLE_VALUES)[number], (typeof LICENSE_TYPE_VALUES)[number]>> = {
  doctor: 'medical_syndicate',
  nurse: 'nursing_syndicate',
  physiotherapist: 'physiotherapy_syndicate',
};

const emptyToUndefined = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

const baseStaffShape = {
  name: z.string().trim().min(2, 'Full name is required.').max(120, 'Name is too long.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(160),
  role: z.enum(STAFF_ROLE_VALUES),
  clinicalLicenseType: z.preprocess(emptyToUndefined, z.enum(LICENSE_TYPE_VALUES).optional()),
  clinicalLicenseNumber: z.preprocess(emptyToUndefined, z.string().trim().max(80).optional()),
  clinicalLicenseExpiry: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  licenseIssuingBody: z.preprocess(emptyToUndefined, z.string().trim().max(160).optional()),
  isOnCall: z.boolean().default(false),
  isClinicalDirector: z.boolean().default(false),
  publicDoctorId: z.preprocess((value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return value;
  }, z.number().int().positive().optional()),
};

type StaffShapeOutput = {
  role: (typeof STAFF_ROLE_VALUES)[number];
  clinicalLicenseType?: (typeof LICENSE_TYPE_VALUES)[number];
  clinicalLicenseNumber?: string;
  clinicalLicenseExpiry?: string;
};

/**
 * The clinical-safety gate: a clinician role cannot exist without a valid,
 * discipline-matching, non-expired licence — this is what `canSignClinical`
 * relies on at every clinical write. If a non-clinician carries a licence
 * (e.g. a licensed medical-ops user), it must still be internally complete.
 */
function enforceLicenceIntegrity(data: StaffShapeOutput, ctx: z.RefinementCtx): void {
  const required = REQUIRED_LICENSE_BY_ROLE[data.role];
  const hasType = !!data.clinicalLicenseType && data.clinicalLicenseType !== 'none';

  const requireNumberAndExpiry = () => {
    if (!data.clinicalLicenseNumber?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['clinicalLicenseNumber'], message: 'Licence number is required.' });
    }
    if (!data.clinicalLicenseExpiry) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['clinicalLicenseExpiry'], message: 'Licence expiry date is required.' });
      return;
    }
    const expiry = new Date(data.clinicalLicenseExpiry);
    if (Number.isNaN(expiry.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['clinicalLicenseExpiry'], message: 'Enter a valid expiry date.' });
    } else if (expiry.getTime() < Date.now()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['clinicalLicenseExpiry'], message: 'Licence is already expired — it cannot be saved.' });
    }
  };

  if (required) {
    if (data.clinicalLicenseType !== required) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clinicalLicenseType'],
        message: `This clinical role requires a ${required.replace(/_/g, ' ')}.`,
      });
    }
    requireNumberAndExpiry();
  } else if (hasType) {
    requireNumberAndExpiry();
  }
}

export const createStaffSchema = z.object(baseStaffShape).superRefine(enforceLicenceIntegrity);

export const updateStaffSchema = z
  .object({ ...baseStaffShape, staffId: z.string().trim().min(1, 'Missing staff id.') })
  .superRefine(enforceLicenceIntegrity);

export const setStaffStatusSchema = z.object({
  staffId: z.string().trim().min(1, 'Missing staff id.'),
  status: z.enum(STAFF_STATUS_VALUES),
});

export const issueCredentialLinkSchema = z.object({
  staffId: z.string().trim().min(1, 'Missing staff id.'),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
