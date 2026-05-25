/**
 * Authenticated document streaming.
 *
 * Streams private EHR files from the storage layer ONLY to the patient who
 * owns the document (or staff — once auth roles are extended).
 *
 * - Never serves files from `public/`.
 * - Rate-limited per IP to slow enumeration / scraping.
 * - Emits an audit-log entry for every successful view.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { Readable } from 'node:stream';
import { auth } from '@/auth';
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
  const allowed = await checkRateLimit(`portal-document:${ip}`, 60, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: corsHeaders },
    );
  }

  const session = await auth();
  if (!session?.user || session.user.role !== 'patient' || !session.user.patientId) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401, headers: corsHeaders },
    );
  }

  const { id } = await ctx.params;
  const doc = await prisma.document.findFirst({
    where: { id, patientId: session.user.patientId, deletedAt: null },
    select: {
      id: true,
      title: true,
      storagePath: true,
      mimeType: true,
      fileSizeBytes: true,
    },
  });

  if (!doc || !doc.storagePath) {
    return NextResponse.json(
      { error: 'not_found' },
      { status: 404, headers: corsHeaders },
    );
  }

  const storage = getFileStorage();
  if (!(await storage.exists(doc.storagePath))) {
    return NextResponse.json(
      { error: 'file_missing' },
      { status: 410, headers: corsHeaders },
    );
  }

  let result;
  try {
    result = await storage.read(doc.storagePath, doc.mimeType);
  } catch (err) {
    appLogger.error('portal.document.read_failed', { documentId: doc.id, err: String(err) });
    return NextResponse.json(
      { error: 'read_failed' },
      { status: 500, headers: corsHeaders },
    );
  }

  // TODO(audit): emit AuditLog row { action: 'view', table: 'documents',
  //   recordId: doc.id, changedBy: session.user.id } once the audit Prisma
  //   extension lands (EHR Phase 3).
  appLogger.info('portal.document.view', {
    documentId: doc.id,
    patientId: session.user.patientId,
  });

  const url = new URL(req.url);
  const wantsDownload = url.searchParams.get('download') === '1';
  const disposition = wantsDownload ? 'attachment' : 'inline';
  const safeTitle = doc.title.replace(/[^A-Za-z0-9._ -]+/g, '_').slice(0, 80) || 'document';

  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', result.mimeType ?? 'application/octet-stream');
  if (result.size) headers.set('Content-Length', String(result.size));
  headers.set(
    'Content-Disposition',
    `${disposition}; filename="${safeTitle}"`,
  );
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'no-referrer');

  const webStream = Readable.toWeb(result.stream) as unknown as ReadableStream<Uint8Array>;
  return new NextResponse(webStream, { status: 200, headers });
}

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: resolveCorsHeaders(req.headers.get('origin')) });
}

// Force Node runtime — fs / stream APIs are unavailable on edge.
export const runtime = 'nodejs';
// Avoid any static-optimization attempts.
export const dynamic = 'force-dynamic';

// Silence unused-import warning when ReadableStream type is re-shaped above.
type _UnusedWeb = WebReadableStream<Uint8Array> | undefined;
const _u: _UnusedWeb = undefined;
void _u;
