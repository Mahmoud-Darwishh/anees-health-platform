import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { CLINICAL_READ_ROLES, getSessionUser, isCaseScopedClinicalRole, staffHasRole } from '@/lib/auth/rbac';
import { getPatientDocumentBinary } from '@/lib/medplum/documents';
import { getPrivateMedicalObject } from '@/lib/storage/r2-medical';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { listCareTeamPatientIdsForPractitioner } from '@/lib/medplum/care-teams';
import { getOwnPatientRecord } from '@/lib/portal/patient-record';
import { prisma } from '@/lib/db/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

async function writeDocumentAudit(params: {
  action: 'export' | 'access_denied';
  documentId: string;
  patientMedplumId?: string | null;
  user: AuthenticatedUser;
  reason?: string;
  expectedChecksumSha256?: string | null;
  actualChecksumSha256?: string | null;
}) {
  try {
    const actorId = params.user.staffId ?? params.user.patientId ?? params.user.id;

    await prisma.auditLog.create({
      data: {
        tableName: 'document_reference',
        recordId: params.documentId,
        action: params.action,
        changedFields: {
          patientMedplumId: params.patientMedplumId ?? null,
          actorRole: params.user.role,
          staffRole: params.user.staffRole ?? null,
          reason: params.reason ?? null,
          expectedChecksumSha256: params.expectedChecksumSha256 ?? null,
          actualChecksumSha256: params.actualChecksumSha256 ?? null,
        },
        changedBy: actorId,
      },
    });
  } catch {
    // Best-effort only.
  }
}

function patientIdFromReference(reference?: string): string | null {
  if (!reference) return null;
  const [resourceType, id] = reference.split('/');
  if (resourceType !== 'Patient' || !id) return null;
  return id;
}

function safeDownloadName(input?: string, fallback = 'document.bin'): string {
  const normalized = (input ?? '')
    .replace(/[\r\n"]/g, '')
    .replace(/[\\/:*?<>|]/g, '_')
    .trim();

  return normalized || fallback;
}

function buildContentDispositionHeader(filename: string, mode: 'inline' | 'attachment'): string {
  const encoded = encodeURIComponent(filename);
  return `${mode}; filename="${filename}"; filename*=UTF-8''${encoded}`;
}

function resolveDispositionMode(requestUrl: string): 'inline' | 'attachment' {
  const mode = new URL(requestUrl).searchParams.get('disposition')?.toLowerCase();
  return mode === 'inline' ? 'inline' : 'attachment';
}

async function canReadDocumentForPatient(user: AuthenticatedUser, patientMedplumId: string): Promise<boolean> {

  if (user.role === 'staff' && user.staffId) {
    if (!staffHasRole(user, CLINICAL_READ_ROLES)) {
      return false;
    }

    if (!isCaseScopedClinicalRole(user.staffRole ?? null)) {
      return true;
    }

    const practitioner = await ensureCachedMedplumPractitionerForStaff({
      staffId: user.staffId,
      name: user.name ?? user.email ?? `Staff ${user.staffId}`,
      email: user.email,
      role: user.staffRole,
    });

    const visiblePatientIds = await listCareTeamPatientIdsForPractitioner(practitioner.reference);
    return visiblePatientIds.includes(patientMedplumId);
  }

  if (user.role === 'patient') {
    const ownRecord = await getOwnPatientRecord();
    if (!ownRecord?.patient.medplumPatientId) {
      return false;
    }

    // Caregiver-linked accounts are intentionally denied for documents until document-level consent scopes are added.
    if (ownRecord.access.mode !== 'patient') {
      return false;
    }

    return ownRecord.patient.medplumPatientId === patientMedplumId;
  }

  return false;
}

export async function GET(request: Request, context: RouteContext) {
  const { documentId } = await context.params;
  const user = await getSessionUser();
  const dispositionMode = resolveDispositionMode(request.url);

  if (!documentId || !documentId.trim()) {
    return NextResponse.json({ error: 'Document id is required.' }, { status: 400 });
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await getPatientDocumentBinary(documentId.trim());
  if (!payload) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }

  const patientMedplumId = patientIdFromReference(payload.document.subject?.reference);
  if (!patientMedplumId) {
    return NextResponse.json({ error: 'Document ownership could not be validated.' }, { status: 404 });
  }

  const authorized = await canReadDocumentForPatient(user, patientMedplumId);
  if (!authorized) {
    await writeDocumentAudit({
      action: 'access_denied',
      documentId: documentId.trim(),
      patientMedplumId,
      user,
      reason: 'authorization_denied',
    });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fail closed: serve ONLY documents that have passed a clean malware scan.
  // A 'pending' (never-scanned) document is blocked just like an infected one —
  // unscanned PHI must never be served. Documents are scanned at upload time and
  // by the background scan job; until a clean verdict is recorded they stay blocked.
  if (payload.malwareStatus !== 'clean') {
    await writeDocumentAudit({
      action: 'access_denied',
      documentId: documentId.trim(),
      patientMedplumId,
      user,
      reason: `malware_status_${payload.malwareStatus}`,
    });

    const isPending = payload.malwareStatus === 'pending';
    return NextResponse.json(
      {
        error: isPending
          ? 'Document is awaiting a security scan and cannot be served yet. Please try again shortly.'
          : `Document is blocked by security policy (status: ${payload.malwareStatus}).`,
      },
      { status: isPending ? 409 : 423 },
    );
  }

  if (payload.r2ObjectKey) {
    const object = await getPrivateMedicalObject(payload.r2ObjectKey);
    if (!object) {
      return NextResponse.json({ error: 'Document object is unavailable.' }, { status: 404 });
    }

    const actualChecksumSha256 = createHash('sha256').update(object.body).digest('hex');
    if (payload.checksumSha256 && actualChecksumSha256 !== payload.checksumSha256) {
      await writeDocumentAudit({
        action: 'access_denied',
        documentId: documentId.trim(),
        patientMedplumId,
        user,
        reason: 'checksum_mismatch',
        expectedChecksumSha256: payload.checksumSha256,
        actualChecksumSha256,
      });

      return NextResponse.json(
        { error: 'Document integrity check failed; access is blocked.' },
        { status: 409 },
      );
    }

    await writeDocumentAudit({
      action: 'export',
      documentId: documentId.trim(),
      patientMedplumId,
      user,
      reason: payload.checksumSha256 ? 'integrity_verified' : 'integrity_unverified_legacy',
      expectedChecksumSha256: payload.checksumSha256,
      actualChecksumSha256,
    });

    const attachment = payload.document.content?.[0]?.attachment;
    const filename = safeDownloadName(
      attachment?.title || payload.document.type?.text,
      `${documentId}.bin`,
    );
    const contentType = object.contentType || attachment?.contentType || 'application/octet-stream';
    const body = new Uint8Array(object.body);

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(body.byteLength),
        'Content-Disposition': buildContentDispositionHeader(filename, dispositionMode),
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  return NextResponse.json(
    { error: 'Document is not stored in Cloudflare R2. Run docs:migrate:r2 to migrate legacy attachments.' },
    { status: 409 },
  );
}
