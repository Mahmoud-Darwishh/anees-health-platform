import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

type R2Config = {
  bucket: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function resolveR2Endpoint(): string {
  const endpoint = process.env.R2_ENDPOINT?.trim();
  if (endpoint) {
    return endpoint;
  }

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  if (accountId) {
    return `https://${accountId}.r2.cloudflarestorage.com`;
  }

  throw new Error('Missing R2 endpoint. Set R2_ENDPOINT or R2_ACCOUNT_ID.');
}

function getConfig(): R2Config {
  const provider = process.env.STORAGE_PROVIDER?.trim().toLowerCase();
  if (provider && provider !== 'r2') {
    throw new Error('Cloudflare R2 storage is not enabled. Set STORAGE_PROVIDER=r2 (or unset it).');
  }

  return {
    bucket: getRequiredEnv('R2_BUCKET'),
    endpoint: resolveR2Endpoint(),
    accessKeyId: getRequiredEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: getRequiredEnv('R2_SECRET_ACCESS_KEY'),
  };
}

let cachedClient: S3Client | null = null;
let cachedConfigKey: string | null = null;

function getClient(): { client: S3Client; config: R2Config } {
  const config = getConfig();
  const key = `${config.endpoint}|${config.bucket}|${config.accessKeyId}`;

  if (!cachedClient || cachedConfigKey !== key) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    cachedConfigKey = key;
  }

  return { client: cachedClient, config };
}

function sanitizeFilename(name: string): string {
  const basename = name.replace(/^.*[\\/]/, '');
  return basename.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120) || 'file';
}

function buildObjectKey(patientId: string, originalFilename: string): string {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const safeName = sanitizeFilename(originalFilename);
  const randomPrefix = randomUUID();
  return `ehr/${yyyy}/${mm}/${randomPrefix}-${safeName}`;
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) {
    throw new Error('R2 object body is empty.');
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  const withTransform = body as { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof withTransform.transformToByteArray === 'function') {
    const bytes = await withTransform.transformToByteArray();
    return Buffer.from(bytes);
  }

  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  throw new Error('Unsupported R2 response body type.');
}

export async function putPrivateMedicalObject(input: {
  patientId: string;
  originalFilename: string;
  contentType: string;
  data: Buffer;
}): Promise<{ objectKey: string; sizeBytes: number; contentType: string; checksumSha256: string }> {
  const { client, config } = getClient();
  const objectKey = buildObjectKey(input.patientId, input.originalFilename);

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
      Body: input.data,
      ContentType: input.contentType || 'application/octet-stream',
      ServerSideEncryption: 'AES256',
    }),
  );

  const checksumSha256 = createHash('sha256').update(input.data).digest('hex');

  return {
    objectKey,
    sizeBytes: input.data.byteLength,
    contentType: input.contentType || 'application/octet-stream',
    checksumSha256,
  };
}

export async function getPrivateMedicalObject(objectKey: string): Promise<{
  body: Buffer;
  contentType: string | null;
  sizeBytes: number | null;
} | null> {
  const { client, config } = getClient();

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
      }),
    );

    return {
      body: await bodyToBuffer(response.Body),
      contentType: response.ContentType ?? null,
      sizeBytes: response.ContentLength ?? null,
    };
  } catch {
    return null;
  }
}

export async function deletePrivateMedicalObject(objectKey: string): Promise<void> {
  const { client, config } = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: objectKey,
    }),
  );
}
