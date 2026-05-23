/**
 * Server-side specialty data access.
 */

import { prisma } from '@/lib/db/prisma';

export interface SpecialtyOption {
  value: string; // code, e.g. "geriatrics"
  nameEn: string;
  nameAr: string;
}

export async function getSpecialties(): Promise<SpecialtyOption[]> {
  const rows = await prisma.specialty.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { code: true, nameEn: true, nameAr: true },
  });
  return rows.map((r) => ({ value: r.code, nameEn: r.nameEn, nameAr: r.nameAr }));
}
