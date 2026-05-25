/**
 * Staff soft-delete for a document.
 *
 *   POST /api/admin/patients/[id]/documents/[docId]/delete
 *
 * We use POST (not DELETE) so the action is reachable from a plain `<form>`.
 * The document is soft-deleted (`deletedAt`) — clinical records are never
 * hard-deleted. The audited Prisma client emits an `AuditLog` row.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStaffPermission } from '@/lib/auth';
import { canAccessPatientRecord } from '@/lib/auth/record-access';
import { getAuditedPrisma } from '@/lib/db/audited-prisma';
import { prisma } from '@/lib/db/prisma';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { checkRateLimit, getClientIp } from '@/lib/utils/rate-limit';
import { logger as appLogger } from '@/lib/utils/app-logger';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; docId: string }> },
): Promise<NextResponse> {
  const corsHeaders = resolveCorsHeaders(req.headers.get('origin'));

  const ip = getClientIp(req);
  const allowed = await checkRateLimit(`admin-document-delete:${ip}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: corsHeaders });
  }

  let session;
  try {
    session = await requireStaffPermission('clinical.write');
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const { id: patientId, docId } = await ctx.params;

  if (!(await canAccessPatientRecord(session, patientId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: corsHeaders });
  }

  const doc = await prisma.document.findFirst({
    where: { id: docId, patientId, deletedAt: null },
    select: { id: true },
  });
  if (!doc) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: corsHeaders });
  }

  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  try {
    await auditedPrisma.document.update({
      where: { id: docId },
      data: { deletedAt: new Date() },
    });
  } catch (err) {
    appLogger.error('admin.document.delete_failed', { docId, err: String(err) });
    const url = new URL(`/admin/patients/${patientId}/documents?error=delete_failed`, req.url);
    return NextResponse.redirect(url, { status: 303 });
  }

  appLogger.info('admin.document.deleted', { docId, patientId });

  const url = new URL(`/admin/patients/${patientId}/documents?success=deleted`, req.url);
  return NextResponse.redirect(url, { status: 303 });
}

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: resolveCorsHeaders(req.headers.get('origin')),
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
