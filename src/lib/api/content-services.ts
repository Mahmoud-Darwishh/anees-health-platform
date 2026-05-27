/**
 * Server-side content service data access (marketing /services page).
 */

import { prisma } from '@/lib/db/prisma';

export interface ContentServiceItem {
  code: string;       // e.g. "doctorVisits" — also the i18n key segment
  iconClass: string;  // e.g. "fa-solid fa-heart-pulse"
  landingSlug: string | null; // e.g. "doctor-at-home" or null
}

export async function getContentServices(): Promise<ContentServiceItem[]> {
  const rows = await prisma.contentService.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { code: true, iconClass: true, landingSlug: true },
  });
  return rows;
}

