import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextAuthRequest } from 'next-auth';
import createIntlMiddleware from 'next-intl/middleware';
import { locales } from '@/i18n/request';
import { canAccessAdminPath, getAdminHomePath } from '@/lib/auth/permissions';

const DEFAULT_LOCALE = 'en';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});

export default auth((req: NextAuthRequest) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // ── Admin routes ─────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      if (session?.user?.role === 'staff') {
        return NextResponse.redirect(new URL(getAdminHomePath(session.user.staffRole), req.url));
      }
      return NextResponse.next();
    }

    if (!session || session.user?.role !== 'staff') {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!canAccessAdminPath(session.user.staffRole, pathname)) {
      const fallbackUrl = new URL(getAdminHomePath(session.user.staffRole), req.url);
      fallbackUrl.searchParams.set('forbidden', '1');
      return NextResponse.redirect(fallbackUrl);
    }

    return NextResponse.next();
  }

  // ── Patient portal routes (future: /[locale]/portal/*) ───────────────────
  const localePattern = new RegExp(`^/(${locales.join('|')})/portal`);
  if (localePattern.test(pathname)) {
    if (!session || session.user?.role !== 'patient') {
      const locale = pathname.split('/')[1] || DEFAULT_LOCALE;
      const loginUrl = new URL(`/${locale}/auth/login`, req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Public locale routes ─────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return intlMiddleware(req as any);
});

export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!api|_next/static|_next/image|favicon|assets|logos|manifest|~offline|robots.txt|sitemap|.*\\..*).*)',
  ],
};
