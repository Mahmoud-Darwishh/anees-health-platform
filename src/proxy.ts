import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';
import type { NextAuthRequest } from 'next-auth';
import createIntlMiddleware from 'next-intl/middleware';
import { locales } from '@/i18n/request';
import { canAccessRoute, homeRouteForRole } from '@/lib/auth/route-access';
import type { StaffRole } from '@prisma/client';

const DEFAULT_LOCALE = 'en';

/**
 * Staff-auth pages that must be reachable without a session. Kept under /admin
 * so they inherit the chrome-less admin shell, but allowlisted here so the staff
 * gate below does not bounce unauthenticated staff into a redirect loop.
 */
const PUBLIC_STAFF_AUTH_PATHS = ['/admin/login', '/admin/set-password'];

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});

/**
 * Staff gate for /admin/* and /clinician/* (English-only, no locale prefix).
 * Wrapped in NextAuth `auth()` so the session JWT is decoded ONLY for staff
 * surfaces — NEVER on public marketing traffic, which is overwhelmingly
 * anonymous and now statically/ISR cached. Two gates, in order:
 *   1. Authenticated staff only — unauthenticated visitors go to staff login.
 *   2. Role gate — the role must be allowed in this URL family (route-access).
 *      A wrong role is bounced to its own home section (no redirect loops).
 * Page + loader guards still run server-side as defence in depth.
 */
const staffGate = auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (!session?.user?.staffId) {
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (session.user.staffRole ?? null) as StaffRole | null;
  if (!canAccessRoute(pathname, role)) {
    return NextResponse.redirect(new URL(homeRouteForRole(role), req.url));
  }
  return NextResponse.next();
});

/**
 * Root proxy (Next.js 16 middleware). Routes each request to the cheapest path:
 * static/framework requests are bypassed, staff surfaces run the auth-wrapped
 * `staffGate` (the only place the session cookie is decoded), and public locale
 * routes run just the next-intl locale routing — no auth machinery. This keeps
 * anonymous public traffic off the auth/session code path entirely.
 */
export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  // ── Hard bypass for API and framework/static files ───────────────────────
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/logos') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/~offline') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /\.[^/]+$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // ── Public staff-auth pages — reachable WITHOUT a session (no auth needed) ─
  if (PUBLIC_STAFF_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // ── Staff surfaces — decode the session ONLY here ─────────────────────────
  if (pathname.startsWith('/admin') || pathname.startsWith('/clinician')) {
    // `auth()` returns a route-handler-typed fn; invoked as middleware it takes
    // (req, event). Casts bridge the type mismatch — runtime behaviour is the
    // same NextAuth middleware as before, now only on staff routes.
    return staffGate(req as NextAuthRequest, event as unknown as Parameters<typeof staffGate>[1]);
  }

  // ── Public locale routes — no session decode; just locale routing ─────────
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon|assets|logos|manifest|~offline|robots.txt|sitemap|.*\\..*).*)',
  ],
};
