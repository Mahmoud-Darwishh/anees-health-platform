/**
 * Fixed-window rate limiter backed by the rate_limits table.
 *
 * Trade-offs:
 * - Uses the existing Postgres connection — no extra infra (Redis/Upstash).
 * - Has a small race window under concurrent requests; for healthcare-app
 *   traffic this is acceptable. If volume grows, swap the backend to Upstash
 *   without changing the call sites.
 *
 * The DB layer must clean up expired rows periodically; an `expiresAt` index
 * is in the schema for that purpose.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * Extract the real client IP from common proxy headers. Falls back to
 * 'unknown' so the limiter still works (one global bucket for all unknowns).
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

/**
 * @param key         Unique bucket id (e.g. `"booking-create:1.2.3.4"`)
 * @param max         Max requests allowed in the window
 * @param windowMs    Window length in milliseconds
 * @param failClosed  When the backend is unreachable: `false` (default) allows
 *                    the request through (fail open — right for non-security
 *                    funnels); `true` blocks it (fail closed). Pass `true` for
 *                    security-critical buckets (login, OTP, password reset,
 *                    registration) so a DB hiccup can't silently disable
 *                    brute-force/credential-stuffing protection.
 * @returns           true if request is allowed, false if rate-limited
 */
export async function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
  failClosed = false,
): Promise<boolean> {
  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + windowMs);

  try {
    const existing = await prisma.rateLimit.findUnique({ where: { key } });

    // No bucket yet, or previous window has expired → start fresh
    if (!existing || existing.expiresAt < now) {
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, windowStart: now, expiresAt: newExpiresAt },
        update: { count: 1, windowStart: now, expiresAt: newExpiresAt },
      });
      return true;
    }

    if (existing.count >= max) return false;

    await prisma.rateLimit.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return true;
  } catch (err) {
    // Backend unreachable. Security-critical callers (failClosed=true) block the
    // request so a DB hiccup can't disable brute-force protection; everyone else
    // fails open so a limiter outage never blocks a legitimate request. Always
    // log so we notice.
    console.error(
      `[rate-limit] backend error — failing ${failClosed ? 'closed' : 'open'} (key=${key}):`,
      err,
    );
    return !failClosed;
  }
}

/** Standard 429 response, optionally merged with CORS headers. */
export function tooManyRequests(extraHeaders: Record<string, string> = {}): NextResponse {
  return NextResponse.json(
    { success: false, message: 'Too many requests. Please try again shortly.' },
    {
      status: 429,
      headers: {
        ...extraHeaders,
        'Retry-After': '60',
      },
    },
  );
}
