import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextAuthRequest } from 'next-auth';
import createIntlMiddleware from 'next-intl/middleware';
import { locales } from '@/i18n/request';
import { canAccessRoute, homeRouteForRole } from '@/lib/auth/route-access';
import type { StaffRole } from '@prisma/client';

const DEFAULT_LOCALE = 'en';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Hard bypass for API and framework/static files. Even with matcher guards,
  // auth-wrapped middleware can still run in some Next.js dev scenarios.
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

  // ── Staff surfaces: /admin/* and /clinician/* (English-only, no locale) ──
  // Two gates, in order:
  //   1. Authenticated staff only — unauthenticated visitors go to staff login.
  //   2. Role gate — the role must be allowed in this URL family (route-access).
  //      A wrong role is bounced to its own home section (no redirect loops).
  // Page + loader guards still run server-side as defence in depth.
  if (pathname.startsWith('/admin') || pathname.startsWith('/clinician')) {
    if (!session?.user?.staffId) {
      const loginUrl = new URL(`/${DEFAULT_LOCALE}/auth/login`, req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = (session.user.staffRole ?? null) as StaffRole | null;
    if (!canAccessRoute(pathname, role)) {
      return NextResponse.redirect(new URL(homeRouteForRole(role), req.url));
    }
    return NextResponse.next();
  }

  // ── Public locale routes ─────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return intlMiddleware(req as any);
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon|assets|logos|manifest|~offline|robots.txt|sitemap|.*\\..*).*)',
  ],
};
