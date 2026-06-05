'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/clinician/today', label: 'My Journey' },
  { href: '/clinician/patients', label: 'Patients' },
  { href: '/clinician/tasks', label: 'Tasks' },
  { href: '/clinician/earnings', label: 'Earnings' },
  { href: '/clinician/profile', label: 'Profile' },
];

function isItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ClinicianBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="clinician-bottom-nav" aria-label="Clinician navigation">
      {NAV_ITEMS.map((item) => {
        const active = isItemActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? 'clinician-nav-link is-active' : 'clinician-nav-link'}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
