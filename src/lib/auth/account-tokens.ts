import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db/prisma';

/**
 * SINGLE-USE ACCOUNT TOKENS (invite / set-password).
 * ---------------------------------------------------
 * Reuses the existing NextAuth `verification_tokens` table — we do NOT use the
 * email magic-link provider, so the table is otherwise unused and needs no
 * schema migration.
 *
 * Security posture:
 *  - The raw token is returned ONCE (in the invite/reset URL) and NEVER stored.
 *    Only its SHA-256 hash is persisted, so a database leak cannot be replayed
 *    into account takeovers.
 *  - The token is single-use: it is deleted on resolve.
 *  - Lookups are by the unique hash; the comparison is constant-time.
 *  - The `identifier` encodes the purpose + subject (`staff_invite:<staffId>`),
 *    so a token minted for one purpose can never be spent on another.
 */

export type AccountTokenPurpose = 'staff_invite';

const TTL_MS: Record<AccountTokenPurpose, number> = {
  // Admin-issued staff invite / password-reset link. Long enough to hand over
  // out-of-band, short enough to limit exposure if the link leaks.
  staff_invite: 7 * 24 * 60 * 60 * 1000,
};

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function identifierFor(purpose: AccountTokenPurpose, subjectId: string): string {
  return `${purpose}:${subjectId}`;
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

/**
 * Mint a new token for `subjectId`, invalidating any previous outstanding token
 * for the same purpose+subject (so a reissue revokes the old link). Returns the
 * RAW token to embed in the link — it is never recoverable again.
 */
export async function issueAccountToken(purpose: AccountTokenPurpose, subjectId: string): Promise<string> {
  const raw = randomBytes(32).toString('base64url');
  const identifier = identifierFor(purpose, subjectId);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashToken(raw),
      expires: new Date(Date.now() + TTL_MS[purpose]),
    },
  });

  return raw;
}

type ResolvedToken = { subjectId: string };

/**
 * Validate a raw token. With `{ consume: true }` the token is deleted (single
 * use) — call that only when actually performing the protected action. With
 * `{ consume: false }` it is left in place so the set-password page can render
 * the form before the user submits.
 *
 * Returns the subject id on success, or `null` for any failure (unknown token,
 * wrong purpose, expired) — callers must not distinguish the reasons to a user.
 */
export async function resolveAccountToken(
  purpose: AccountTokenPurpose,
  rawToken: string | null | undefined,
  options: { consume: boolean },
): Promise<ResolvedToken | null> {
  if (!rawToken) {
    return null;
  }

  const hashed = hashToken(rawToken);
  const row = await prisma.verificationToken.findUnique({ where: { token: hashed } });
  if (!row) {
    return null;
  }

  const prefix = `${purpose}:`;
  const purposeMatches = row.identifier.startsWith(prefix);
  const notExpired = row.expires.getTime() >= Date.now();
  // Re-confirm the stored hash matches in constant time (defence against any
  // future change that loosens the unique-index lookup).
  const hashMatches = constantTimeEquals(row.token, hashed);

  if (options.consume) {
    await prisma.verificationToken.delete({ where: { token: hashed } }).catch(() => {
      // Already gone (double submit) — treated as invalid below.
    });
  }

  if (!purposeMatches || !notExpired || !hashMatches) {
    return null;
  }

  return { subjectId: row.identifier.slice(prefix.length) };
}
