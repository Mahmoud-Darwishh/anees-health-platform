'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isAdminNavItemActive, type AdminNavItem } from '@/lib/auth/admin-nav-policy';

/**
 * Renders the admin nav pills with active-section highlighting. The list of
 * items is computed server-side (role-filtered in the layout); this component
 * only adds the client-side concern — which section you're currently in.
 */
export function AdminNav({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="anees-admin-nav-links" aria-label="Admin workspace sections">
      {items.map((item) => {
        // External links (e.g. Metabase) open in a new tab and are never active.
        if (item.external) {
          return (
            <a
              key={item.href}
              href={item.href}
              title={item.description}
              target="_blank"
              rel="noopener noreferrer"
              className="anees-admin-nav-link"
            >
              {item.label}
              <span aria-hidden="true"> ↗</span>
            </a>
          );
        }

        const active = isAdminNavItemActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={item.description}
            aria-current={active ? 'page' : undefined}
            className={active ? 'anees-admin-nav-link is-active' : 'anees-admin-nav-link'}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
