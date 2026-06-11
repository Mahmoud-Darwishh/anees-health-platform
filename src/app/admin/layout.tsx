import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser, isStaff } from '@/lib/auth/rbac';
import { getAdminNavItems } from '@/lib/auth/admin-nav-policy';
import { AdminNav } from './AdminNav';
import './admin-theme.scss';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const visibleNavItems = getAdminNavItems(user?.staffRole);

  // Defence in depth — proxy.ts already gates /admin, but never trust it alone.
  if (!isStaff(user)) {
    redirect('/en/auth/login?callbackUrl=/admin');
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
      <main className="container py-4 anees-admin-page">{children}</main>
    </div>
  );
}
