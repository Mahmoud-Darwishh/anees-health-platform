import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateMedicalObject } from '@/lib/storage/r2-medical';
import {
  extractR2ObjectKey,
  getDocumentChecksumSha256,
  getPatientDocumentReference,
  listDocumentsForMalwareScan,
  updateDocumentMalwareState,
} from '@/lib/medplum/documents';
import { scanMedicalDocument } from '@/lib/security/malware-scan';
import { checkRateLimit, getClientIp, tooManyRequests } from '@/lib/utils/rate-limit';
import { resolveCorsHeaders } from '@/lib/utils/cors';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';

type ScanRequestBody = {
  documentId?: string;
  limit?: number;
  includeFailed?: boolean;
};

function isAuthorized(request: NextRequest): boolean {
  const scannerKey = process.env.EHR_DOCUMENT_SCAN_KEY?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();

  const keys = [scannerKey, cronSecret].filter((key): key is string => !!key);
  if (keys.length === 0) return false;

  const incoming =
    request.headers.get('x-ehr-scan-key') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

  return !!incoming && keys.includes(incoming);
}

function normalizeLimit(value: unknown): number {
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.min(100, Math.floor(parsed)));
    }
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) return 20;
  return Math.max(1, Math.min(100, Math.floor(value)));
}

async function runScanBatch(options: {
  requestedDocumentId?: string;
  includeFailed: boolean;
  limit: number;
  actorTag: string;
}) {
  const targets = options.requestedDocumentId
    ? [await getPatientDocumentReference(options.requestedDocumentId)].filter(
        (doc): doc is NonNullable<typeof doc> => !!doc,
      )
    : await listDocumentsForMalwareScan(options.limit, options.includeFailed);

  const result = {
    scanned: 0,
    clean: 0,
    infected: 0,
    scanFailed: 0,
    skippedNoR2: 0,
    skippedChecksumMismatch: 0,
    errors: [] as Array<{ documentId: string; message: string }>,
  };

  for (const document of targets) {
    if (!document.id) {
      continue;
    }

    result.scanned += 1;
    const attachment = document.content?.[0]?.attachment;
    const r2ObjectKey = extractR2ObjectKey(attachment?.url);

    if (!r2ObjectKey) {
      result.skippedNoR2 += 1;
      continue;
    }

    const object = await getPrivateMedicalObject(r2ObjectKey);
    if (!object) {
      await updateDocumentMalwareState({
        documentId: document.id,
        status: 'scan_failed',
      });

      await prisma.auditLog.create({
        data: {
          tableName: 'document_reference',
          recordId: document.id,
          action: 'update',
          changedFields: {
            source: 'api.internal.ehr.documents.scan',
            status: 'scan_failed',
            reason: 'r2_object_missing',
          },
          changedBy: options.actorTag,
        },
      });

      result.scanFailed += 1;
      continue;
    }

    const actualChecksum = createHash('sha256').update(object.body).digest('hex');
    const expectedChecksum = getDocumentChecksumSha256(document);

    if (expectedChecksum && expectedChecksum !== actualChecksum) {
      await updateDocumentMalwareState({
        documentId: document.id,
        status: 'scan_failed',
        checksumSha256: actualChecksum,
      });

      await prisma.auditLog.create({
        data: {
          tableName: 'document_reference',
          recordId: document.id,
          action: 'update',
          changedFields: {
            source: 'api.internal.ehr.documents.scan',
            status: 'scan_failed',
            reason: 'checksum_mismatch',
          },
          changedBy: options.actorTag,
        },
      });

      result.skippedChecksumMismatch += 1;
      result.scanFailed += 1;
      continue;
    }

    const scan = await scanMedicalDocument({
      data: object.body,
      fileName: attachment?.title || `${document.id}.bin`,
      contentType: object.contentType || attachment?.contentType || 'application/octet-stream',
      checksumSha256: actualChecksum,
    });

    const status = scan.verdict === 'clean' ? 'clean' : scan.verdict === 'infected' ? 'infected' : 'scan_failed';

    await updateDocumentMalwareState({
      documentId: document.id,
      status,
      checksumSha256: actualChecksum,
      engine: scan.engine,
      signature: scan.signature ?? null,
    });

    await prisma.auditLog.create({
      data: {
        tableName: 'document_reference',
        recordId: document.id,
        action: 'update',
        changedFields: {
          source: 'api.internal.ehr.documents.scan',
          status,
          engine: scan.engine,
          signature: scan.signature ?? null,
        },
        changedBy: options.actorTag,
      },
    });

    if (status === 'clean') {
      result.clean += 1;
    } else if (status === 'infected') {
      result.infected += 1;
    } else {
      result.scanFailed += 1;
    }
  }

  return result;
}

export async function POST(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));

  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`ehr-document-scan:${ip}`, 30, 60_000);
  if (!allowed) {
    return tooManyRequests(cors);
  }

  let payload: ScanRequestBody = {};
  try {
    payload = (await request.json()) as ScanRequestBody;
  } catch {
    // Optional body.
  }

  const requestedDocumentId = payload.documentId?.trim();
  const includeFailed = !!payload.includeFailed;
  const limit = normalizeLimit(payload.limit);
  const result = await runScanBatch({
    requestedDocumentId,
    includeFailed,
    limit,
    actorTag: `system_scan_ip:${ip}`,
  });

  return NextResponse.json({ success: true, ...result }, { status: 200, headers: cors });
}

export async function GET(request: NextRequest) {
  const cors = resolveCorsHeaders(request.headers.get('origin'));

  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401, headers: cors });
  }

  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`ehr-document-scan:${ip}`, 30, 60_000);
  if (!allowed) {
    return tooManyRequests(cors);
  }

  const { searchParams } = request.nextUrl;
  const requestedDocumentId = searchParams.get('documentId')?.trim() || undefined;
  const includeFailed = (searchParams.get('includeFailed') || '').toLowerCase() === 'true';
  const limit = normalizeLimit(searchParams.get('limit'));
  const result = await runScanBatch({
    requestedDocumentId,
    includeFailed,
    limit,
    actorTag: `system_scan_ip:${ip}`,
  });

  return NextResponse.json({ success: true, ...result }, { status: 200, headers: cors });
}
