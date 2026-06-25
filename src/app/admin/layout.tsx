import Image from 'next/image';
import Link from 'next/link';
import { getSessionUser, isStaff } from '@/lib/auth/rbac';
import { getAdminNavItems } from '@/lib/auth/admin-nav-policy';
import { AdminNav } from './AdminNav';
import { LastRefreshed, BackToTop } from './AdminFooterClient';
import packageJson from '../../../package.json';
import './admin-theme.scss';

export const dynamic = 'force-dynamic';

const appVersion = packageJson.version;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const visibleNavItems = getAdminNavItems(user?.staffRole);
  // Server render timestamp for the "last refreshed" chip. Date.now() is correct
  // and intentional in this `force-dynamic` Server Component (it runs once per
  // request, on the server); react-hooks/purity can't tell an RSC from a client
  // render, so it is disabled for this single line.
  // eslint-disable-next-line react-hooks/purity
  const renderedAt = Date.now();

  // The only unauthenticated requests that reach this layout are the public
  // staff-auth pages (/admin/login, /admin/set-password) — proxy.ts redirects
  // every other /admin/* path to the staff login. Render those chrome-less, so
  // the console nav/footer (and its redirect) never wrap a sign-in screen.
  if (!isStaff(user)) {
    return <div className="anees-admin-shell anees-admin-auth-shell">{children}</div>;
  }

  return (
    <div className="anees-admin-shell">
      <nav className="navbar anees-admin-navbar px-3">
        <Link href="/admin" className="navbar-brand mb-0 h1 anees-admin-brand">
          <span className="anees-admin-brand-lockup">
            <Image
              src="/assets/img/anees-logo.png"
              alt="Anees Health"
              width={44}
              height={44}
              className="anees-admin-brand-logo"
            />
            <span className="anees-admin-brand-copy">
              <span className="anees-admin-brand-title">Anees Admin</span>
              <span className="anees-admin-brand-subtitle">Clinical Operations Console</span>
            </span>
          </span>
        </Link>
        <AdminNav items={visibleNavItems} />
        <div className="anees-admin-navbar-right">
          <Link href="/en" className="anees-admin-nav-link anees-admin-home-link">
            Back to home
          </Link>
          <span className="anees-admin-user-chip">
            {user.name ?? user.email} · {user.staffRole}
          </span>
        </div>
      </nav>

      <div className="anees-admin-subbar">
        <div className="container anees-admin-subbar-inner">
          <LastRefreshed renderedAt={renderedAt} />
        </div>
      </div>

      <main className="container py-4 anees-admin-page">{children}</main>

      <footer className="anees-admin-footer" role="contentinfo">
        <div className="container anees-admin-footer-inner">
          <p className="anees-admin-footer-notice">
            <span aria-hidden="true">🔒</span>
            Contains Protected Health Information — access is monitored and audited.
          </p>
          <div className="anees-admin-footer-meta">
            <span>Anees Clinical Operations Console · v{appVersion}</span>
            <span>© {new Date().getFullYear()} Anees Health</span>
          </div>
        </div>
      </footer>

      <BackToTop />
    </div>
  );
}
