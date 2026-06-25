import 'server-only';

import { prisma } from '@/lib/db/prisma';

export type MyProfileRequest = {
  id: string;
  status: string;
  headline: string | null;
  bioEn: string | null;
  bioAr: string | null;
  specialties: string | null;
  languages: string | null;
  photoUrl: string | null;
  reviewNote: string | null;
  createdAtIso: string;
};

export type PendingProfileRequest = MyProfileRequest & {
  staffId: string;
  staffName: string;
  staffRole: string;
};

export async function getMyLatestProfileRequest(staffId: string): Promise<MyProfileRequest | null> {
  const row = await prisma.profileChangeRequest.findFirst({
    where: { staffId },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    headline: row.headline,
    bioEn: row.bioEn,
    bioAr: row.bioAr,
    specialties: row.specialties,
    languages: row.languages,
    photoUrl: row.photoUrl,
    reviewNote: row.reviewNote,
    createdAtIso: row.createdAt.toISOString(),
  };
}

export async function getPendingProfileRequests(tenantId: string): Promise<PendingProfileRequest[]> {
  const rows = await prisma.profileChangeRequest.findMany({
    where: { tenantId, status: 'pending' },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
  if (rows.length === 0) return [];

  const staff = await prisma.staff.findMany({
    // Tenant-scoped: belt-and-suspenders — staffIds already come from this
    // tenant's requests, but pin the tenant so a cross-tenant id can't resolve.
    where: { id: { in: rows.map((r) => r.staffId) }, tenantId },
    select: { id: true, name: true, role: true },
  });
  const staffById = new Map(staff.map((s) => [s.id, s]));

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    headline: row.headline,
    bioEn: row.bioEn,
    bioAr: row.bioAr,
    specialties: row.specialties,
    languages: row.languages,
    photoUrl: row.photoUrl,
    reviewNote: row.reviewNote,
    createdAtIso: row.createdAt.toISOString(),
    staffId: row.staffId,
    staffName: staffById.get(row.staffId)?.name ?? 'Unknown',
    staffRole: staffById.get(row.staffId)?.role ?? '—',
  }));
}
