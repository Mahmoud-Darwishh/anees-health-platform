import 'server-only';

import { getMedplumClient } from './client';
import { MEDPLUM_CODE_SYSTEMS } from './constants';

type FhirReference = {
  reference?: string;
  display?: string;
};

type FhirCoding = {
  system?: string;
  code?: string;
  display?: string;
};

export type DocumentReferenceResource = {
  resourceType: 'DocumentReference';
  id?: string;
  status: 'current' | 'superseded' | 'entered-in-error';
  identifier?: Array<{ system?: string; value?: string }>;
  subject?: FhirReference;
  type?: { coding?: FhirCoding[]; text?: string };
  category?: Array<{ coding?: FhirCoding[] }>;
  date?: string;
  author?: FhirReference[];
  content: Array<{
    attachment: {
      contentType?: string;
      title?: string;
      url?: string;
      size?: number;
    };
  }>;
};

export type BinaryResource = {
  resourceType: 'Binary';
  id?: string;
  contentType: string;
  data?: string;
  securityContext?: FhirReference;
};

export type DocumentCategory = 'report' | 'lab' | 'imaging' | 'insurance' | 'consent' | 'other';

export type DocumentSummary = {
  id: string;
  title: string;
  category: DocumentCategory;
  contentType?: string;
  createdAt?: string;
  author?: string;
  sizeBytes?: number;
  binaryId?: string;
};

export type CreatePatientDocumentInput = {
  patientId: string;
  title: string;
  originalFilename: string;
  contentType: string;
  data: Buffer;
  category?: DocumentCategory;
  note?: string | null;
  authorReference?: string | null;
  authorDisplay?: string | null;
  documentDate?: Date | null;
};

function extractBinaryId(reference?: string): string | undefined {
  if (!reference) {
    return undefined;
  }

  const normalized = reference.trim().split('?')[0].replace(/\/+$/, '');
  const match = normalized.match(/(?:^|\/)Binary\/([^/?#]+)(?:\/_history\/[^/?#]+)?(?:\/\$binary)?$/i);

  if (match?.[1]) {
    return match[1];
  }

  // Fallback for direct Binary IDs persisted without a resource prefix.
  if (/^[A-Za-z0-9\-.]{1,128}$/.test(normalized)) {
    return normalized;
  }

  return undefined;
}

function extractCategory(document: DocumentReferenceResource): DocumentCategory {
  const code = document.category?.[0]?.coding?.[0]?.code?.toLowerCase();
  switch (code) {
    case 'lab':
    case 'imaging':
    case 'insurance':
    case 'consent':
    case 'other':
      return code;
    default:
      return 'report';
  }
}

function summarizeDocument(document: DocumentReferenceResource): DocumentSummary | null {
  if (!document.id) return null;

  const attachment = document.content?.[0]?.attachment;
  return {
    id: document.id,
    title: attachment?.title ?? document.type?.text ?? 'Document',
    category: extractCategory(document),
    contentType: attachment?.contentType,
    createdAt: document.date,
    author: document.author?.[0]?.display,
    sizeBytes: attachment?.size,
    binaryId: extractBinaryId(attachment?.url),
  };
}

export async function listPatientDocuments(patientId: string, count = 50): Promise<DocumentSummary[]> {
  const medplum = await getMedplumClient();

  const documents = (await medplum.searchResources('DocumentReference', {
    subject: `Patient/${patientId}`,
    _count: String(count),
    _sort: '-date',
  })) as DocumentReferenceResource[];

  return documents.map(summarizeDocument).filter((item): item is DocumentSummary => !!item);
}

export async function getPatientDocumentReference(documentId: string): Promise<DocumentReferenceResource | null> {
  const medplum = await getMedplumClient();
  const normalizedId = documentId.trim().replace(/^DocumentReference\//i, '');

  if (!normalizedId) {
    return null;
  }

  try {
    return (await medplum.readResource('DocumentReference', normalizedId)) as DocumentReferenceResource;
  } catch {
    try {
      const byId = (await medplum.searchResources('DocumentReference', {
        _id: normalizedId,
        _count: '1',
      })) as DocumentReferenceResource[];

      if (byId[0]) {
        return byId[0];
      }
    } catch {
      // No-op: fallback below.
    }

    try {
      const byIdentifier = (await medplum.searchResources('DocumentReference', {
        identifier: normalizedId,
        _count: '1',
      })) as DocumentReferenceResource[];

      return byIdentifier[0] ?? null;
    } catch {
      return null;
    }
  }
}

export async function getPatientDocumentBinary(documentId: string): Promise<{
  document: DocumentReferenceResource;
  binary: BinaryResource | null;
  attachmentUrl: string | null;
  binaryId: string | null;
} | null> {
  const medplum = await getMedplumClient();
  const document = await getPatientDocumentReference(documentId);
  const attachmentUrl = document?.content?.[0]?.attachment?.url?.trim() ?? null;
  const binaryId = extractBinaryId(attachmentUrl ?? undefined);

  if (!document) {
    return null;
  }

  if (!binaryId) {
    return {
      document,
      binary: null,
      attachmentUrl,
      binaryId: null,
    };
  }

  try {
    const binary = (await medplum.readResource('Binary', binaryId)) as BinaryResource;
    return { document, binary, attachmentUrl, binaryId };
  } catch {
    return {
      document,
      binary: null,
      attachmentUrl,
      binaryId,
    };
  }
}

export async function createPatientDocument(input: CreatePatientDocumentInput): Promise<DocumentSummary> {
  const medplum = await getMedplumClient();

  const binary = (await medplum.createResource({
    resourceType: 'Binary',
    contentType: input.contentType,
    data: input.data.toString('base64'),
    securityContext: {
      reference: `Patient/${input.patientId}`,
      display: input.title,
    },
  } as never)) as BinaryResource;

  const document = (await medplum.createResource({
    resourceType: 'DocumentReference',
    status: 'current',
    identifier: [
      {
        system: 'https://anees.health/fhir/identifier/document',
        value: `${input.patientId}-${Date.now()}`,
      },
    ],
    subject: { reference: `Patient/${input.patientId}` },
    type: {
      coding: [
        {
          system: MEDPLUM_CODE_SYSTEMS.documentCategory,
          code: input.category ?? 'report',
          display: input.title,
        },
      ],
      text: input.title,
    },
    category: [
      {
        coding: [
          {
            system: MEDPLUM_CODE_SYSTEMS.documentCategory,
            code: input.category ?? 'report',
            display: input.title,
          },
        ],
      },
    ],
    date: (input.documentDate ?? new Date()).toISOString(),
    author: input.authorReference
      ? [{ reference: input.authorReference, display: input.authorDisplay ?? undefined }]
      : undefined,
    content: [
      {
        attachment: {
          contentType: input.contentType,
          title: input.originalFilename,
          url: `Binary/${binary.id}`,
          size: input.data.byteLength,
        },
      },
    ],
  } as never)) as DocumentReferenceResource;

  const summary = summarizeDocument(document);
  if (!summary) {
    throw new Error('Failed to create document reference.');
  }

  return summary;
}

export async function deletePatientDocument(documentId: string): Promise<{
  documentId: string;
  binaryId: string | null;
  attachmentUrl: string | null;
}> {
  const medplum = await getMedplumClient();
  const document = await getPatientDocumentReference(documentId);

  if (!document?.id) {
    throw new Error('Document not found.');
  }

  const attachmentUrl = document.content?.[0]?.attachment?.url?.trim() ?? null;
  const binaryId = extractBinaryId(attachmentUrl ?? undefined) ?? null;

  await medplum.deleteResource('DocumentReference', document.id);

  if (binaryId) {
    try {
      await medplum.deleteResource('Binary', binaryId);
    } catch {
      // Best-effort cleanup; keep document deletion as source-of-truth outcome.
    }
  }

  return {
    documentId: document.id,
    binaryId,
    attachmentUrl,
  };
}