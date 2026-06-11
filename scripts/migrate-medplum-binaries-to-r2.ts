import { randomUUID } from 'node:crypto';
import { ClientStorage, MedplumClient, MemoryStorage } from '@medplum/core';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

type FhirReference = {
  reference?: string;
  display?: string;
};

type DocumentReferenceResource = {
  resourceType: 'DocumentReference';
  id?: string;
  subject?: FhirReference;
  content: Array<{
    attachment: {
      contentType?: string;
      title?: string;
      url?: string;
      size?: number;
    };
  }>;
};

type BinaryResource = {
  resourceType: 'Binary';
  id?: string;
  contentType: string;
  data?: string;
};

const R2_ATTACHMENT_PREFIX = 'urn:anees:r2:';

function toR2DocumentAttachmentUrl(objectKey: string): string {
  return `${R2_ATTACHMENT_PREFIX}${encodeURIComponent(objectKey)}`;
}

function extractR2ObjectKey(reference?: string): string | undefined {
  if (!reference) {
    return undefined;
  }

  const trimmed = reference.trim();
  if (!trimmed.startsWith(R2_ATTACHMENT_PREFIX)) {
    return undefined;
  }

  const encodedKey = trimmed.slice(R2_ATTACHMENT_PREFIX.length);
  if (!encodedKey) {
    return undefined;
  }

  try {
    const decoded = decodeURIComponent(encodedKey);
    return decoded || undefined;
  } catch {
    return undefined;
  }
}

function extractBinaryId(reference?: string): string | undefined {
  if (!reference) {
    return undefined;
  }

  const normalized = reference.trim().split('?')[0].replace(/\/+$/, '');
  const match = normalized.match(/(?:^|\/)Binary\/([^/?#]+)(?:\/_history\/[^/?#]+)?(?:\/\$binary)?$/i);

  if (match?.[1]) {
    return match[1];
  }

  if (/^[A-Za-z0-9\-.]{1,128}$/.test(normalized)) {
    return normalized;
  }

  return undefined;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function getScriptMedplumClient(): Promise<MedplumClient> {
  const client = new MedplumClient({
    baseUrl: getRequiredEnv('MEDPLUM_BASE_URL'),
    cacheTime: 0,
    storage: new ClientStorage(new MemoryStorage()),
    logLevel: process.env.NODE_ENV === 'development' ? 'basic' : 'none',
  });

  await client.startClientLogin(
    getRequiredEnv('MEDPLUM_CLIENT_ID'),
    getRequiredEnv('MEDPLUM_CLIENT_SECRET'),
  );

  return client;
}

function sanitizeFilename(name: string): string {
  const basename = name.replace(/^.*[\\/]/, '');
  return basename.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120) || 'file';
}

function buildR2ObjectKey(patientId: string, originalFilename: string): string {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const safePatient = patientId.replace(/[^A-Za-z0-9_-]+/g, '_');
  const safeFilename = sanitizeFilename(originalFilename);
  return `ehr/${safePatient}/${yyyy}/${mm}/${randomUUID()}-${safeFilename}`;
}

let cachedR2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!cachedR2Client) {
    cachedR2Client = new S3Client({
      region: 'auto',
      endpoint: getRequiredEnv('R2_ENDPOINT'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: getRequiredEnv('R2_ACCESS_KEY_ID'),
        secretAccessKey: getRequiredEnv('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  return cachedR2Client;
}

async function putPrivateMedicalObject(input: {
  patientId: string;
  originalFilename: string;
  contentType: string;
  data: Buffer;
}): Promise<{ objectKey: string; sizeBytes: number; contentType: string }> {
  if (process.env.STORAGE_PROVIDER?.trim().toLowerCase() !== 'r2') {
    throw new Error('STORAGE_PROVIDER must be set to r2 for migration.');
  }

  const objectKey = buildR2ObjectKey(input.patientId, input.originalFilename);
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: getRequiredEnv('R2_BUCKET'),
      Key: objectKey,
      Body: input.data,
      ContentType: input.contentType || 'application/octet-stream',
      ServerSideEncryption: 'AES256',
    }),
  );

  return {
    objectKey,
    sizeBytes: input.data.byteLength,
    contentType: input.contentType || 'application/octet-stream',
  };
}

type ScriptOptions = {
  apply: boolean;
  deleteLegacyBinaries: boolean;
  batchSize: number;
  maxDocuments: number;
};

function parseOptions(argv: string[]): ScriptOptions {
  const has = (flag: string) => argv.includes(flag);
  const readNumber = (flag: string, fallback: number) => {
    const index = argv.indexOf(flag);
    if (index < 0) return fallback;
    const value = Number(argv[index + 1]);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
  };

  return {
    apply: has('--apply'),
    deleteLegacyBinaries: has('--delete-legacy-binaries'),
    batchSize: readNumber('--batch-size', 50),
    maxDocuments: readNumber('--limit', Number.MAX_SAFE_INTEGER),
  };
}

function getPatientId(reference?: string): string | null {
  if (!reference) return null;
  const [resourceType, id] = reference.split('/');
  if (resourceType !== 'Patient' || !id) return null;
  return id;
}

function getAttachment(document: DocumentReferenceResource) {
  return document.content?.[0]?.attachment;
}

async function downloadMedplumAttachmentViaUrl(
  medplum: MedplumClient,
  attachmentUrl: string,
): Promise<{ body: Buffer; contentType: string | null } | null> {
  try {
    const response = await medplum.downloadResponse(attachmentUrl, { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      body: Buffer.from(bytes),
      contentType: response.headers.get('content-type'),
    };
  } catch {
    return null;
  }
}

async function run(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const medplum = await getScriptMedplumClient();

  const stats = {
    scanned: 0,
    alreadyR2: 0,
    migrated: 0,
    migratedFromBinary: 0,
    migratedFromStorageUrl: 0,
    skippedNoAttachment: 0,
    skippedNoPatient: 0,
    skippedNoBinaryId: 0,
    skippedBinaryMissingData: 0,
    skippedUnsupportedAttachment: 0,
    failed: 0,
    deletedLegacyBinary: 0,
  };

  let offset = 0;

  while (stats.scanned < options.maxDocuments) {
    const remaining = options.maxDocuments - stats.scanned;
    const count = Math.max(1, Math.min(options.batchSize, remaining));

    const docs = (await medplum.searchResources('DocumentReference', {
      _count: String(count),
      _offset: String(offset),
      _sort: '-date',
    })) as DocumentReferenceResource[];

    if (docs.length === 0) {
      break;
    }

    for (const doc of docs) {
      stats.scanned += 1;

      if (!doc.id) {
        stats.failed += 1;
        continue;
      }

      const attachment = getAttachment(doc);
      const attachmentUrl = attachment?.url?.trim();

      if (!attachmentUrl) {
        stats.skippedNoAttachment += 1;
        continue;
      }

      if (extractR2ObjectKey(attachmentUrl)) {
        stats.alreadyR2 += 1;
        continue;
      }

      const binaryId = extractBinaryId(attachmentUrl);

      const patientId = getPatientId(doc.subject?.reference);
      if (!patientId) {
        stats.skippedNoPatient += 1;
        continue;
      }

      try {
        const filename = attachment.title || `${doc.id}.bin`;
        let contentType = attachment.contentType || 'application/octet-stream';
        let data: Buffer;
        let source: 'binary' | 'storage_url';

        if (binaryId) {
          const binary = (await medplum.readResource('Binary', binaryId)) as BinaryResource;
          if (!binary.data) {
            stats.skippedBinaryMissingData += 1;
            continue;
          }

          contentType = binary.contentType || contentType;
          data = Buffer.from(binary.data, 'base64');
          source = 'binary';
        } else {
          const downloaded = await downloadMedplumAttachmentViaUrl(medplum, attachmentUrl);
          if (!downloaded) {
            stats.skippedNoBinaryId += 1;
            continue;
          }

          if (!downloaded.body || downloaded.body.byteLength === 0) {
            stats.skippedUnsupportedAttachment += 1;
            continue;
          }

          contentType = downloaded.contentType || contentType;
          data = downloaded.body;
          source = 'storage_url';
        }

        const uploaded = await putPrivateMedicalObject({
          patientId,
          originalFilename: filename,
          contentType,
          data,
        });

        if (options.apply) {
          const updatedDocument = {
            ...doc,
            content: [
              {
                attachment: {
                  ...attachment,
                  contentType,
                  size: uploaded.sizeBytes,
                  url: toR2DocumentAttachmentUrl(uploaded.objectKey),
                },
              },
            ],
          };

          await medplum.updateResource(updatedDocument as never);

          if (options.deleteLegacyBinaries && binaryId) {
            try {
              await medplum.deleteResource('Binary', binaryId);
              stats.deletedLegacyBinary += 1;
            } catch {
              // Best-effort cleanup.
            }
          }
        }

        stats.migrated += 1;
        if (source === 'binary') {
          stats.migratedFromBinary += 1;
        } else {
          stats.migratedFromStorageUrl += 1;
        }
      } catch {
        stats.failed += 1;
      }
    }

    offset += docs.length;
  }

  const mode = options.apply ? 'APPLY' : 'DRY-RUN';
  // eslint-disable-next-line no-console
  console.log(`[${mode}] Medplum Binary -> R2 migration summary`);
  // eslint-disable-next-line no-console
  console.table(stats);
  // eslint-disable-next-line no-console
  console.log(
    `Flags: --apply=${options.apply} --delete-legacy-binaries=${options.deleteLegacyBinaries} --batch-size=${options.batchSize} --limit=${options.maxDocuments}`,
  );
}

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
