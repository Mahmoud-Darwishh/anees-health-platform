/**
 * Staff document upload.
 *
 *   POST /api/admin/patients/[id]/documents
 *     multipart/form-data:
 *       file:     <File>         required
 *       title:    string          optional (defaults to filename)
 *       category: string          required (see ALLOWED_CATEGORIES)
 *       visitId:  string          optional
 *
 * Auth: staff with `clinical.write` permission AND record-level access to the
 * target patient. Writes go through the audited Prisma client so every upload
 * emits an `AuditLog` row automatically.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireStaffPermission } from '@/lib/auth';
import { canAccessPatientRecord } from '@/lib/auth/record-access';
import { getAuditedPrisma } from '@/lib/db/audited-prisma';
import { prisma } from '@/lib/db/prisma';
import { getFileStorage } from '@/lib/storage/file-storage';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { checkRateLimit, getClientIp } from '@/lib/utils/rate-limit';
import { logger as appLogger } from '@/lib/utils/app-logger';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME = new Set<string>([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/dicom',
  'application/octet-stream', // DICOM frequently arrives as this
]);

const ALLOWED_EXTENSIONS = new Set<string>([
  'pdf', 'jpg', 'jpeg', 'png', 'webp', 'dcm', 'dicom',
]);

const ALLOWED_CATEGORIES = new Set<string>([
  'lab_result',
  'imaging',
  'discharge_summary',
  'referral',
  'prescription',
  'consent',
  'insurance',
  'other',
]);

function fileExt(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const corsHeaders = resolveCorsHeaders(req.headers.get('origin'));

  const ip = getClientIp(req);
  const allowed = await checkRateLimit(`admin-document-upload:${ip}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: corsHeaders });
  }

  let session;
  try {
    session = await requireStaffPermission('clinical.write');
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const { id: patientId } = await ctx.params;

  if (!(await canAccessPatientRecord(session, patientId))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403, headers: corsHeaders });
  }

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, deletedAt: null },
    select: { id: true },
  });
  if (!patient) {
    return NextResponse.json({ error: 'not_found' }, { status: 404, headers: corsHeaders });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400, headers: corsHeaders });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return redirectBack(req, patientId, 'error=missing_file');
  }
  if (file.size > MAX_BYTES) {
    return redirectBack(req, patientId, 'error=file_too_large');
  }

  const mime = (file.type || '').toLowerCase();
  const ext = fileExt(file.name);
  if (!ALLOWED_MIME.has(mime) && !ALLOWED_EXTENSIONS.has(ext)) {
    return redirectBack(req, patientId, 'error=unsupported_type');
  }

  const rawCategory = String(form.get('category') ?? '').trim();
  const category = ALLOWED_CATEGORIES.has(rawCategory) ? rawCategory : 'other';

  const rawTitle = String(form.get('title') ?? '').trim().slice(0, 200);
  const title = rawTitle.length > 0 ? rawTitle : file.name.slice(0, 200) || 'Document';

  const rawVisitId = String(form.get('visitId') ?? '').trim();
  let visitId: string | null = null;
  if (rawVisitId.length > 0) {
    const visit = await prisma.visit.findFirst({
      where: { id: rawVisitId, patientId },
      select: { id: true },
    });
    if (visit) visitId = visit.id;
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let saved;
  try {
    saved = await getFileStorage().save({
      patientId,
      originalFilename: file.name,
      mimeType: mime || 'application/octet-stream',
      data: buffer,
    });
  } catch (err) {
    appLogger.error('admin.document.save_failed', { patientId, err: String(err) });
    return redirectBack(req, patientId, 'error=storage_failed');
  }

  const auditedPrisma = getAuditedPrisma(session.user.staffId ?? session.user.id);

  try {
    await auditedPrisma.document.create({
      data: {
        patientId,
        visitId,
        title,
        category,
        storagePath: saved.storagePath,
        mimeType: saved.mimeType,
        fileSizeBytes: saved.fileSizeBytes,
        checksum: saved.checksum,
        uploadedByStaffId: session.user.staffId ?? session.user.id,
      },
    });
  } catch (err) {
    appLogger.error('admin.document.db_failed', { patientId, err: String(err) });
    return redirectBack(req, patientId, 'error=db_failed');
  }

  appLogger.info('admin.document.uploaded', {
    patientId,
    category,
    bytes: saved.fileSizeBytes,
  });

  return redirectBack(req, patientId, 'success=uploaded');
}

export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: resolveCorsHeaders(req.headers.get('origin')),
  });
}

function redirectBack(req: NextRequest, patientId: string, query: string): NextResponse {
  const url = new URL(`/admin/patients/${patientId}/documents?${query}`, req.url);
  return NextResponse.redirect(url, { status: 303 });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
