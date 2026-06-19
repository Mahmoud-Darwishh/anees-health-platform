import 'server-only';

import { requireStaffCan } from '@/lib/auth/policy/enforce';
import { prisma } from '@/lib/db/prisma';
import { sessionTenantId } from '@/lib/db/tenant-scope';
import {
  buildClinicianTodayData,
  formatDayLabel,
  type ClinicianTodayData,
  type ClinicianTodayVisit,
  type ClinicianVisitFlowState,
  type ClinicianVisitPrimaryAction,
} from '@/features/ehr/clinician-shared/visit-flow';

// Back-compat aliases — the physio view + session code import these names. The
// flow logic now lives in the discipline-agnostic `clinician-shared/visit-flow`.
export type PhysioVisitFlowState = ClinicianVisitFlowState;
export type PhysioVisitPrimaryAction = ClinicianVisitPrimaryAction;
export type PhysioTodayVisit = ClinicianTodayVisit;
export type PhysioTodayData = ClinicianTodayData;

export async function getPhysioTodayData(): Promise<PhysioTodayData> {
  const { user: staff } = await requireStaffCan('workspace.physio.access');

  const staffRecord = await prisma.staff.findUnique({
    where: { id: staff.staffId },
    select: { providerId: true },
  });

  if (!staffRecord?.providerId) {
    return {
      dateLabel: formatDayLabel(new Date()),
      totalVisits: 0,
      completedVisits: 0,
      inProgressVisits: 0,
      upcomingVisits: 0,
      visits: [],
      warning: 'Your staff account is not linked to a provider profile yet. Ask admin to connect Staff.providerId.',
    };
  }

  return buildClinicianTodayData({
    providerId: staffRecord.providerId,
    tenantId: sessionTenantId(staff),
  });
}
