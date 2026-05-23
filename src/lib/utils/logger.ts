/**
 * Coverage-check analytics stored in PostgreSQL via Prisma.
 * No PII — IP addresses are hashed before storage.
 */

import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';

export interface CoverageCheckLog {
  id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  covered: boolean;
  areaName?: string;
  ipHash?: string;
  userAgent?: string;
}

/** SHA-256 prefix of the raw IP — 16 hex chars, no reversible PII */
function hashIP(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip + (process.env.HASH_SALT || 'anees-health'))
    .digest('hex')
    .substring(0, 16);
}

/**
 * Persist a coverage check to the database (non-blocking — caller should .catch())
 */
export async function logCoverageCheck(data: {
  latitude: number;
  longitude: number;
  covered: boolean;
  areaName?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.coverageCheck.create({
    data: {
      latitude: data.latitude,
      longitude: data.longitude,
      covered: data.covered,
      areaName: data.areaName ?? null,
      ipHash: data.ip ? hashIP(data.ip) : null,
      userAgent: data.userAgent ?? null,
    },
  });
}

/**
 * Aggregate coverage-check statistics from the database
 */
export async function getCoverageStats(): Promise<{
  totalChecks: number;
  coveredChecks: number;
  uncoveredChecks: number;
  recentChecks: CoverageCheckLog[];
}> {
  const [totalChecks, coveredChecks, recent] = await Promise.all([
    prisma.coverageCheck.count(),
    prisma.coverageCheck.count({ where: { covered: true } }),
    prisma.coverageCheck.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  const recentChecks: CoverageCheckLog[] = recent.map((r) => ({
    id: r.id,
    timestamp: r.createdAt.toISOString(),
    latitude: r.latitude,
    longitude: r.longitude,
    covered: r.covered,
    areaName: r.areaName ?? undefined,
    ipHash: r.ipHash ?? undefined,
    userAgent: r.userAgent ?? undefined,
  }));

  return {
    totalChecks,
    coveredChecks,
    uncoveredChecks: totalChecks - coveredChecks,
    recentChecks,
  };
}
