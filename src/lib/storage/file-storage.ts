/**
 * Private EHR file storage.
 *
 * Files NEVER live under `public/`. PHI documents (labs, MRI, scans, reports)
 * are stored at `EHR_STORAGE_ROOT` (default: `/srv/ehr-storage` on Linux,
 * `./private-storage/ehr` for local dev) and streamed only through
 * authenticated API routes.
 *
 * The interface is provider-agnostic so we can swap LocalDiskStorage for
 * S3 (or any signed-URL backend) when EHR Phase 4 lands.
 *
 * Conventions for `storagePath`:
 *   - Always relative to the storage root.
 *   - Format: `<patientId>/<yyyy>/<mm>/<uuid>-<safe-original-filename>`
 *   - Never starts with a slash and never contains `..` segments.
 */

import { createHash, randomUUID } from 'node:crypto';
import { promises as fs, createReadStream } from 'node:fs';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';

export type FileMetadata = {
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  checksum: string;
};

export type SaveFileInput = {
  patientId: string;
  originalFilename: string;
  mimeType: string;
  data: Buffer;
};

export type ReadFileResult = {
  stream: Readable;
  size: number;
  mimeType: string | null;
};

export interface FileStorage {
  save(input: SaveFileInput): Promise<FileMetadata>;
  read(storagePath: string, mimeType?: string | null): Promise<ReadFileResult>;
  exists(storagePath: string): Promise<boolean>;
}

// ── Local disk storage (dev + on-prem) ───────────────────────────────────────

function getStorageRoot(): string {
  const fromEnv = process.env.EHR_STORAGE_ROOT;
  if (fromEnv && fromEnv.trim().length > 0) return resolve(fromEnv);
  // Sensible local dev fallback — still outside `public/`.
  return resolve(process.cwd(), 'private-storage', 'ehr');
}

function sanitizeFilename(name: string): string {
  // Strip any path segments and dangerous characters.
  const basename = name.replace(/^.*[\\/]/, '');
  return basename.replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 120) || 'file';
}

function buildRelativePath(patientId: string, originalFilename: string): string {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const safe = sanitizeFilename(originalFilename);
  return `${patientId}/${yyyy}/${mm}/${randomUUID()}-${safe}`;
}

function assertSafeRelativePath(relativePath: string): void {
  // Defence-in-depth: storagePath must not escape the storage root.
  const normalized = normalize(relativePath);
  if (normalized.startsWith('..') || normalized.split(sep).includes('..')) {
    throw new Error('Invalid storage path');
  }
  if (normalized.startsWith(sep)) {
    throw new Error('Invalid storage path');
  }
}

class LocalDiskStorage implements FileStorage {
  private readonly root: string;

  constructor(root: string) {
    this.root = root;
  }

  async save(input: SaveFileInput): Promise<FileMetadata> {
    const relativePath = buildRelativePath(input.patientId, input.originalFilename);
    assertSafeRelativePath(relativePath);
    const absolute = join(this.root, relativePath);
    await fs.mkdir(dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, input.data, { mode: 0o640 });

    const checksum = createHash('sha256').update(input.data).digest('hex');

    return {
      storagePath: relativePath,
      mimeType: input.mimeType,
      fileSizeBytes: input.data.byteLength,
      checksum,
    };
  }

  async read(storagePath: string, mimeType?: string | null): Promise<ReadFileResult> {
    assertSafeRelativePath(storagePath);
    const absolute = join(this.root, storagePath);
    const stat = await fs.stat(absolute);
    if (!stat.isFile()) throw new Error('Not a file');
    return {
      stream: createReadStream(absolute),
      size: stat.size,
      mimeType: mimeType ?? null,
    };
  }

  async exists(storagePath: string): Promise<boolean> {
    try {
      assertSafeRelativePath(storagePath);
      const absolute = join(this.root, storagePath);
      const stat = await fs.stat(absolute);
      return stat.isFile();
    } catch {
      return false;
    }
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

let cached: FileStorage | null = null;

export function getFileStorage(): FileStorage {
  if (!cached) {
    cached = new LocalDiskStorage(getStorageRoot());
  }
  return cached;
}

/** Exposed for tests / admin diagnostics. */
export function getStorageRootForDiagnostics(): string {
  return getStorageRoot();
}
