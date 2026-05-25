/**
 * Staff document streaming.
 *
 *   GET /api/admin/documents/[id]/file
 *   GET /api/admin/documents/[id]/file?download=1
 *
 * Auth: staff with `clinical.read` + record-level access to the document's
 * patient. Streams private EHR files from the storage layer; the file is
 * never served from `public/`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'node:stream';
import { requireStaffPermission } from '@/lib/auth';
import { canAccessPatientRecord } from '@/lib/auth/record-access';
import { prisma } from '@/lib/db/prisma';
import { getFileStorage } from '@/lib/storage/file-storage';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { checkRateLimit, getClientIp } from '@/lib/utils/rate-limit';
import { logger as appLogger } from '@/lib/utils/app-logger';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const corsHeaders = resolveCorsHeaders(req.headers.get('origin'));

  const ip = getClientIp(req);
  const allowed = await checkRateLimit(`admin-document-read:${ip}`, 120, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: corsHeaders });
  }

  let session;
  try {
    session = await requireStaffPermission('clinical.read');
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const { id } = await ctx.params;

  const doc = await prisma.document.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
      patientId: true,
      storagePath: true,
      mimeType: true,
    },
  });

  if (!doc || !doc.storagePath) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: corsHeaders });
  }

  if (!(await canAccessPatientRecord(session, doc.patientId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: corsHeaders });
  }

  const storage = getFileStorage();
  if (!(await storage.exists(doc.storagePath))) {
    return NextResponse.json({ error: 'file_missing' }, { status: 410, headers: corsHeaders });
  }

  let result;
  try {
    result = await storage.read(doc.storagePath, doc.mimeType);
  } catch (err) {
    appLogger.error('admin.document.read_failed', { documentId: doc.id, err: String(err) });
    return NextResponse.json({ error: 'read_failed' }, { status: 500, headers: corsHeaders });
  }

  appLogger.info('admin.document.view', {
    documentId: doc.id,
    patientId: doc.patientId,
    staffId: session.user.staffId ?? session.user.id,
  });
  // TODO(audit): emit AuditLog `view` row once the audit extension supports
  // read events. Writes are already audited via getAuditedPrisma.

  const url = new URL(req.url);
  const wantsDownload = url.searchParams.get('download') === '1';
  const disposition = wantsDownload ? 'attachment' : 'inline';
  const safeTitle = doc.title.replace(/[^A-Za-z0-9._ -]+/g, '_').slice(0, 80) || 'document';

  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', result.mimeType ?? 'application/octet-stream');
  if (result.size) headers.set('Content-Length', String(result.size));
  headers.set('Content-Disposition', `${disposition}; filename="${safeTitle}"`);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');

  const webStream = Readable.toWeb(result.stream) as unknown as ReadableStream<Uint8Array>;
  return new NextResponse(webStream, { status: 200, headers });
}

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: resolveCorsHeaders(req.headers.get('origin')),
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
