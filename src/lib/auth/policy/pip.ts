import 'server-only';

import type { LicenseType, StaffRole } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { listCareTeamPatientIdsForPractitioner } from '@/lib/medplum/care-teams';
import { isCaseScopedClinicalRole, type StaffLicenseSnapshot } from '@/lib/auth/rbac';
import type { ActionName } from './actions';
import { ACTIONS, type ActionDefinition } from './actions';
import type { DecisionContext, StaffActor } from './can';

export type PolicyInputContext = DecisionContext & {
  targetPatientId?: string | null;
  targetPatientMedplumId?: string | null;
  targetVisitId?: string | null;
};

export type StaffPolicySession = {
  staffId: string;
  staffRole: StaffRole;
  name?: string | null;
  email?: string | null;
  tenantId?: string | null;
  clinicalLicenseType?: LicenseType | null;
  clinicalLicenseNumber?: string | null;
  clinicalLicenseExpiry?: Date | string | null;
};

type TargetPatientFacts = {
  id: string;
  medplumPatientId: string | null;
  tenantId: string | null;
};

async function resolveTargetPatientFacts(context: PolicyInputContext): Promise<TargetPatientFacts | null> {
  if (context.targetPatientId) {
    return prisma.patient.findUnique({
      where: { id: context.targetPatientId },
      select: {
        id: true,
        medplumPatientId: true,
        tenantId: true,
      },
    });
  }

  if (context.targetPatientMedplumId) {
    return prisma.patient.findUnique({
      where: { medplumPatientId: context.targetPatientMedplumId },
      select: {
        id: true,
        medplumPatientId: true,
        tenantId: true,
      },
    });
  }

  if (context.targetVisitId) {
    const visit = await prisma.visit.findUnique({
      where: { id: context.targetVisitId },
      select: {
        tenantId: true,
        patient: {
          select: {
            id: true,
            medplumPatientId: true,
            tenantId: true,
          },
        },
      },
    });
    if (!visit?.patient) {
      return null;
    }
    return {
      id: visit.patient.id,
      medplumPatientId: visit.patient.medplumPatientId,
      tenantId: visit.tenantId ?? visit.patient.tenantId,
    };
  }

  return null;
}

async function resolveCaseScope(params: {
  action: ActionName;
  staff: StaffPolicySession;
  patient: TargetPatientFacts | null;
  fallback?: boolean;
}): Promise<boolean | undefined> {
  const def: ActionDefinition = ACTIONS[params.action];
  if (!def.requiresCaseScope || !isCaseScopedClinicalRole(params.staff.staffRole)) {
    return params.fallback;
  }

  if (!params.patient?.medplumPatientId) {
    return false;
  }

  const practitioner = await ensureCachedMedplumPractitionerForStaff({
    staffId: params.staff.staffId,
    name: params.staff.name ?? params.staff.email ?? `Staff ${params.staff.staffId}`,
    email: params.staff.email ?? null,
    role: params.staff.staffRole,
  });
  const visiblePatientIds = await listCareTeamPatientIdsForPractitioner(practitioner.reference);
  return visiblePatientIds.includes(params.patient.medplumPatientId);
}

export async function loadPolicyFacts(
  action: ActionName,
  staffSession: StaffPolicySession,
  inputContext: PolicyInputContext = {},
): Promise<{ actor: StaffActor; context: DecisionContext }> {
  const [staffRecord, targetPatient] = await Promise.all([
    prisma.staff.findUnique({
      where: { id: staffSession.staffId },
      select: {
        id: true,
        role: true,
        tenantId: true,
        clinicalLicenseType: true,
        clinicalLicenseNumber: true,
        clinicalLicenseExpiry: true,
      },
    }),
    resolveTargetPatientFacts(inputContext),
  ]);

  const tenantId = staffRecord?.tenantId ?? staffSession.tenantId ?? 'platform';
  const license: StaffLicenseSnapshot = {
    staffRole: staffRecord?.role ?? staffSession.staffRole,
    clinicalLicenseType: staffRecord?.clinicalLicenseType ?? staffSession.clinicalLicenseType ?? null,
    clinicalLicenseNumber: staffRecord?.clinicalLicenseNumber ?? staffSession.clinicalLicenseNumber ?? null,
    clinicalLicenseExpiry: staffRecord?.clinicalLicenseExpiry ?? staffSession.clinicalLicenseExpiry ?? null,
  };
  const policyStaff: StaffPolicySession = {
    ...staffSession,
    staffRole: staffRecord?.role ?? staffSession.staffRole,
    tenantId,
    clinicalLicenseType: license.clinicalLicenseType,
    clinicalLicenseNumber: license.clinicalLicenseNumber,
    clinicalLicenseExpiry: license.clinicalLicenseExpiry,
  };

  const inCaseScope = await resolveCaseScope({
    action,
    staff: policyStaff,
    patient: targetPatient,
    fallback: inputContext.inCaseScope,
  });

  const actor: StaffActor = {
    kind: 'staff',
    staffId: staffSession.staffId,
    role: policyStaff.staffRole,
    tenantId,
    license,
  };

  return {
    actor,
    context: {
      ...inputContext,
      targetTenantId: inputContext.targetTenantId ?? targetPatient?.tenantId,
      inCaseScope,
    },
  };
}
