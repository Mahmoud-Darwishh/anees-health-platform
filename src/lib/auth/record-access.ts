import { prisma } from '@/lib/db/prisma';
import type { Session } from 'next-auth';

const ADMIN_BYPASS_ROLES = new Set(['superadmin', 'admin']);

export function canBypassPatientAssignment(session: Session): boolean {
  if (session.user.role !== 'staff') return false;
  return !!session.user.staffRole && ADMIN_BYPASS_ROLES.has(session.user.staffRole);
}

export async function canAccessPatientRecord(session: Session, patientId: string): Promise<boolean> {
  if (session.user.role !== 'staff' || !session.user.staffId) {
    return false;
  }

  if (canBypassPatientAssignment(session)) {
    return true;
  }

  const assignment = await prisma.staffPatientAssignment.findFirst({
    where: {
      staffId: session.user.staffId,
      patientId,
      isActive: true,
    },
    select: { id: true },
  });

  return !!assignment;
}

export async function getAccessiblePatientWhere(session: Session): Promise<{ id?: { in: string[] } }> {
  if (session.user.role !== 'staff' || !session.user.staffId) {
    return { id: { in: [] } };
  }

  if (canBypassPatientAssignment(session)) {
    return {};
  }

  const assignments = await prisma.staffPatientAssignment.findMany({
    where: {
      staffId: session.user.staffId,
      isActive: true,
    },
    select: { patientId: true },
  });

  return { id: { in: assignments.map((item) => item.patientId) } };
}
