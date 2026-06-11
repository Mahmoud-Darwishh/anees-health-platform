import 'server-only';

import { Prisma, type StaffRole } from '@prisma/client';
import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { prisma } from '@/lib/db/prisma';

export type ClinicianPhysioProfileData = {
  staffName: string;
  email: string | null;
  role: StaffRole;
  licenseType: string | null;
  licenseNumber: string | null;
  licenseExpiryIso: string | null;
  profile: {
    onboardingState: string;
    yearsOfExperience: number | null;
    yearsInHomeCare: number | null;
    specialties: string[];
    languages: string[];
    maxVisitsPerDay: number | null;
    canAcceptUrgent: boolean;
    acceptingNewPatients: boolean;
    isPublic: boolean;
    publicReviewCount: number;
    publicVisitCount: number;
    publicRating: string | null;
  } | null;
  warning: string | null;
};

type RawPhysioProfileRow = {
  onboardingState: string;
  yearsOfExperience: number | null;
  yearsInHomeCare: number | null;
  specialties: unknown;
  languages: unknown;
  maxVisitsPerDay: number | null;
  canAcceptUrgent: boolean;
  acceptingNewPatients: boolean;
  isPublic: boolean;
  publicReviewCount: number;
  publicVisitCount: number;
  publicRating: unknown;
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string' && !!entry.trim());
}

function toOptionalString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const next = String(value).trim();
  return next ? next : null;
}

export async function getClinicianPhysioProfileData(): Promise<ClinicianPhysioProfileData> {
  const { user } = await requireStaffCan('workspace.physio.access');

  const staff = await prisma.staff.findUnique({
    where: { id: user.staffId },
    select: {
      name: true,
      email: true,
      role: true,
      clinicalLicenseType: true,
      clinicalLicenseNumber: true,
      clinicalLicenseExpiry: true,
    },
  });

  if (!staff) {
    return {
      staffName: 'Clinician',
      email: null,
      role: user.staffRole,
      licenseType: null,
      licenseNumber: null,
      licenseExpiryIso: null,
      profile: null,
      warning: 'Could not load your staff profile.',
    };
  }

  let rawProfile: RawPhysioProfileRow | null = null;
  let warning: string | null = null;

  try {
    const profile = await prisma.physioProfile.findUnique({
      where: { staffId: user.staffId },
      select: {
        onboardingState: true,
        yearsOfExperience: true,
        yearsInHomeCare: true,
        specialties: true,
        languages: true,
        maxVisitsPerDay: true,
        canAcceptUrgent: true,
        acceptingNewPatients: true,
        isPublic: true,
        publicReviewCount: true,
        publicVisitCount: true,
        publicRating: true,
      },
    });

    rawProfile = profile
      ? {
          onboardingState: profile.onboardingState,
          yearsOfExperience: profile.yearsOfExperience,
          yearsInHomeCare: profile.yearsInHomeCare,
          specialties: profile.specialties,
          languages: profile.languages,
          maxVisitsPerDay: profile.maxVisitsPerDay,
          canAcceptUrgent: profile.canAcceptUrgent,
          acceptingNewPatients: profile.acceptingNewPatients,
          isPublic: profile.isPublic,
          publicReviewCount: profile.publicReviewCount,
          publicVisitCount: profile.publicVisitCount,
          publicRating: profile.publicRating,
        }
      : null;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
      warning = 'Physio profile table is not available yet in this environment.';
    } else {
      warning = 'Physio profile data is temporarily unavailable. Please retry shortly.';
    }
  }

  return {
    staffName: staff.name ?? staff.email ?? 'Clinician',
    email: staff.email,
    role: staff.role,
    licenseType: staff.clinicalLicenseType,
    licenseNumber: staff.clinicalLicenseNumber,
    licenseExpiryIso: staff.clinicalLicenseExpiry?.toISOString() ?? null,
    profile: rawProfile
      ? {
          onboardingState: rawProfile.onboardingState,
          yearsOfExperience: rawProfile.yearsOfExperience,
          yearsInHomeCare: rawProfile.yearsInHomeCare,
          specialties: toStringArray(rawProfile.specialties),
          languages: toStringArray(rawProfile.languages),
          maxVisitsPerDay: rawProfile.maxVisitsPerDay,
          canAcceptUrgent: rawProfile.canAcceptUrgent,
          acceptingNewPatients: rawProfile.acceptingNewPatients,
          isPublic: rawProfile.isPublic,
          publicReviewCount: rawProfile.publicReviewCount,
          publicVisitCount: rawProfile.publicVisitCount,
          publicRating: toOptionalString(rawProfile.publicRating),
        }
      : null,
    warning: warning ?? (rawProfile ? null : 'Physio profile is not configured yet. Ask Med Ops to complete onboarding data.'),
  };
}