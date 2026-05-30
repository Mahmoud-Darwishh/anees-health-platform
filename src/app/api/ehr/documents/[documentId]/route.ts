import { NextResponse } from 'next/server';
import { CLINICAL_ROLES, getSessionUser, isCaseScopedClinicalRole, staffHasRole } from '@/lib/auth/rbac';
import { getPatientDocumentBinary } from '@/lib/medplum/documents';
import { getMedplumClient } from '@/lib/medplum/client';
import { getMedplumConfig } from '@/lib/medplum/config';
import { ensureCachedMedplumPractitionerForStaff } from '@/lib/medplum/practitioners';
import { listCareTeamPatientIdsForPractitioner } from '@/lib/medplum/care-teams';
import { getOwnPatientRecord } from '@/lib/portal/patient-record';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ documentId: string }>;
};

type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

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

function resolveMedplumAttachmentUrl(attachmentUrl: string): string | null {
  const trimmed = attachmentUrl.trim();
  if (!trimmed) {
    return null;
  }

  if (/^Binary\//i.test(trimmed)) {
    return trimmed;
  }

  const medplumOrigin = new URL(getMedplumConfig().baseUrl).origin;

  if (trimmed.startsWith('/')) {
    return `${medplumOrigin}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.origin !== medplumOrigin) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function resolveSameOriginAttachmentUrl(attachmentUrl: string, requestUrl: string): URL | null {
  const requestOrigin = new URL(requestUrl).origin;

  if (attachmentUrl.startsWith('/')) {
    return new URL(attachmentUrl, requestUrl);
  }

  try {
    const parsed = new URL(attachmentUrl);
    return parsed.origin === requestOrigin ? parsed : null;
  } catch {
    return null;
  }
}

async function canReadDocumentForPatient(user: AuthenticatedUser, patientMedplumId: string): Promise<boolean> {

  if (user.role === 'staff' && user.staffId) {
    if (!staffHasRole(user, CLINICAL_ROLES)) {
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
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (payload.binary?.data) {
    const attachment = payload.document.content?.[0]?.attachment;
    const filename = safeDownloadName(
      attachment?.title || payload.document.type?.text,
      `${documentId}.bin`,
    );

    const contentType = payload.binary.contentType || attachment?.contentType || 'application/octet-stream';
    const body = Buffer.from(payload.binary.data, 'base64');

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

  const attachmentUrl = payload.attachmentUrl;
  if (attachmentUrl) {
    const medplumAttachmentUrl = resolveMedplumAttachmentUrl(attachmentUrl);
    if (medplumAttachmentUrl) {
      try {
        const medplum = await getMedplumClient();
        const medplumResponse = await medplum.downloadResponse(medplumAttachmentUrl, { cache: 'no-store' });

        if (medplumResponse.ok) {
          const body = Buffer.from(await medplumResponse.arrayBuffer());
          const attachment = payload.document.content?.[0]?.attachment;
          const filename = safeDownloadName(
            attachment?.title || payload.document.type?.text,
            `${documentId}.bin`,
          );
          const contentType = medplumResponse.headers.get('content-type') || attachment?.contentType || 'application/octet-stream';

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
      } catch {
        // Fall through to same-origin fallback below.
      }
    }

    const sameOriginUrl = resolveSameOriginAttachmentUrl(attachmentUrl, request.url);
    if (sameOriginUrl) {
      const proxied = await fetch(sameOriginUrl, { method: 'GET', cache: 'no-store' });
      if (proxied.ok) {
        const body = Buffer.from(await proxied.arrayBuffer());
        const attachment = payload.document.content?.[0]?.attachment;
        const filename = safeDownloadName(
          attachment?.title || payload.document.type?.text,
          `${documentId}.bin`,
        );
        const contentType = proxied.headers.get('content-type') || attachment?.contentType || 'application/octet-stream';

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
    }
  }

  if (payload.binaryId) {
    return NextResponse.json({ error: 'Document binary payload is unavailable.' }, { status: 404 });
  }

  return NextResponse.json({ error: 'Document attachment URL is unavailable or unsupported.' }, { status: 404 });
}
