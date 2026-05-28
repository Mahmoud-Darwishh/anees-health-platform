import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextAuthRequest } from 'next-auth';
import createIntlMiddleware from 'next-intl/middleware';
import { locales } from '@/i18n/request';

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

  if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL(`/${DEFAULT_LOCALE}`, req.url));
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
