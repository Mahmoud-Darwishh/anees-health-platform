'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
};

const PHYSIO_NAV_ITEMS: NavItem[] = [
  { href: '/clinician/today', label: 'My Journey' },
  { href: '/clinician/patients', label: 'Patients' },
  { href: '/clinician/tasks', label: 'Tasks' },
  { href: '/clinician/earnings', label: 'Earnings' },
  { href: '/clinician/profile', label: 'Profile' },
];

const NURSING_NAV_ITEMS: NavItem[] = [
  { href: '/clinician/nursing/today', label: 'My Journey' },
  { href: '/clinician/nursing/patients', label: 'Patients' },
  { href: '/clinician/nursing/tasks', label: 'Tasks' },
  { href: '/clinician/nursing/profile', label: 'Profile' },
];

const DOCTOR_NAV_ITEMS: NavItem[] = [
  { href: '/clinician/doctor/today', label: 'My Journey' },
  { href: '/clinician/doctor', label: 'My Cases' },
  { href: '/clinician/doctor/patients', label: 'Patients' },
  { href: '/clinician/doctor/profile', label: 'Profile' },
];

function matchesItem(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

const NAV_BY_DISCIPLINE: Record<'physio' | 'nursing' | 'doctor', NavItem[]> = {
  physio: PHYSIO_NAV_ITEMS,
  nursing: NURSING_NAV_ITEMS,
  doctor: DOCTOR_NAV_ITEMS,
};

export function ClinicianBottomNav({ discipline = 'physio' }: { discipline?: 'physio' | 'nursing' | 'doctor' }) {
  const pathname = usePathname();
  const items = NAV_BY_DISCIPLINE[discipline] ?? PHYSIO_NAV_ITEMS;

  // Pick the single most-specific match so a parent route (e.g. /clinician/doctor)
  // does not also light up when a child (…/doctor/profile) is active.
  const activeHref = items
    .filter((item) => matchesItem(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="clinician-bottom-nav" aria-label="Clinician navigation">
      {items.map((item) => {
        const active = item.href === activeHref;
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
