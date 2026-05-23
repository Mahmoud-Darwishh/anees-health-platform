'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import styles from './AdminDashboardShell.module.scss';

type ShellMetricTone = 'sky' | 'mint' | 'amber' | 'rose' | 'violet';

type ShellMetric = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: ShellMetricTone;
};

type ShellQuickLink = {
  href: string;
  label: string;
  tone?: 'default' | 'primary';
};

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

type AdminDashboardShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  metrics?: ShellMetric[];
  quickLinks?: ShellQuickLink[];
  staffName?: string;
  roleLabel?: string | null;
  navBadges?: Partial<Record<string, number>>;
};

const UTILITY_ITEMS: NavItem[] = [
  { href: '/admin/dashboards', label: 'Dashboard Hub', shortLabel: 'DB' },
  { href: '/admin/patients', label: 'Patient Registry', shortLabel: 'PT' },
  { href: '/admin/queues', label: 'Work Queues', shortLabel: 'Q' },
  { href: '/admin/audit-logs', label: 'Audit Logs', shortLabel: 'AU' },
];

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Workspace',
    items: [
      { href: '/admin/dashboards', label: 'Dashboard Hub', shortLabel: 'DB' },
      { href: '/admin/patients', label: 'Patient Registry', shortLabel: 'PT' },
      { href: '/admin/queues', label: 'Work Queues', shortLabel: 'Q' },
    ],
  },
  {
    title: 'Role Dashboards',
    items: [
      { href: '/admin/dashboards/doctor', label: 'Doctor', shortLabel: 'DR' },
      { href: '/admin/dashboards/physio', label: 'Physio', shortLabel: 'PH' },
      { href: '/admin/dashboards/nurse', label: 'Nurse', shortLabel: 'NR' },
      { href: '/admin/dashboards/medical-ops', label: 'Medical Ops', shortLabel: 'MO' },
    ],
  },
  {
    title: 'Oversight',
    items: [{ href: '/admin/audit-logs', label: 'Audit Logs', shortLabel: 'AU' }],
  },
];

function formatRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Clinical Staff';
  return role.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function metricToneClass(tone: ShellMetricTone | undefined): string {
  switch (tone) {
    case 'mint':
      return styles.metricMint;
    case 'amber':
      return styles.metricAmber;
    case 'rose':
      return styles.metricRose;
    case 'violet':
      return styles.metricViolet;
    default:
      return styles.metricSky;
  }
}

export default function AdminDashboardShell({
  title,
  subtitle,
  children,
  metrics = [],
  quickLinks,
  staffName,
  roleLabel,
  navBadges,
}: AdminDashboardShellProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [navQuery, setNavQuery] = useState('');

  const resolvedQuickLinks = useMemo<ShellQuickLink[]>(() => {
    if (quickLinks && quickLinks.length > 0) return quickLinks;

    return [
      { href: '/admin/patients', label: 'Patient Registry' },
      { href: '/admin/queues', label: 'Open Queues' },
      { href: '/admin/dashboards', label: 'Dashboard Hub', tone: 'primary' },
    ];
  }, [quickLinks]);

  const filteredSections = useMemo<NavSection[]>(() => {
    const term = navQuery.trim().toLowerCase();
    if (!term) return NAV_SECTIONS;

    return NAV_SECTIONS
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.label.toLowerCase().includes(term)),
      }))
      .filter((section) => section.items.length > 0);
  }, [navQuery]);

  const shiftLabel = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo',
  }).format(new Date());

  return (
    <div className={styles.frame}>
      <div
        className={`${styles.overlay} ${isSidebarOpen ? styles.overlayVisible : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={styles.utilityRail}>
        <div className={styles.brandPill}>AH</div>

        <nav className={styles.utilityList}>
          {UTILITY_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={isActivePath(pathname, item.href) ? styles.utilityItemActive : styles.utilityItem}
            >
              {item.shortLabel}
            </Link>
          ))}
        </nav>
      </aside>

      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarTopRow}>
          <p className={styles.sidebarTitle}>Clinical Navigation</p>
          <button
            type="button"
            className={styles.closeSidebarButton}
            aria-label="Close navigation"
            onClick={() => setIsSidebarOpen(false)}
          >
            Close
          </button>
        </div>

        <div className={styles.profileCard}>
          <div className={styles.avatar} aria-hidden="true">
            {staffName?.trim().charAt(0).toUpperCase() || 'S'}
          </div>
          <div>
            <p className={styles.profileLabel}>Signed in as</p>
            <h2>{staffName ?? 'Anees Staff'}</h2>
            <span className={styles.rolePill}>{formatRoleLabel(roleLabel)}</span>
          </div>
        </div>

        <label className={styles.searchWrap}>
          <span>Search section</span>
          <input
            type="search"
            value={navQuery}
            onChange={(event) => setNavQuery(event.target.value)}
            placeholder="Type doctor, queues, audit..."
            aria-label="Search navigation"
          />
        </label>

        {filteredSections.map((section) => (
          <section key={section.title} className={styles.navSection}>
            <p className={styles.sectionTitle}>{section.title}</p>
            <nav className={styles.navList}>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActivePath(pathname, item.href) ? styles.navLinkActive : styles.navLink}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <span>{item.label}</span>
                  {(navBadges?.[item.href] ?? 0) > 0 ? (
                    <span className={styles.navBadge}>{navBadges?.[item.href]}</span>
                  ) : null}
                </Link>
              ))}
            </nav>
          </section>
        ))}

        {filteredSections.length === 0 ? (
          <p className={styles.noResults}>No sections match your search.</p>
        ) : null}
      </aside>

      <section className={styles.contentPane}>
        <header className={styles.topBar}>
          <div className={styles.titleBlock}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              aria-label="Toggle sidebar"
              onClick={() => setIsSidebarOpen((current) => !current)}
            >
              Menu
            </button>
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
              <div className={styles.topMetaRow}>
                <span className={styles.metaChip}>EHR Active Shift</span>
                <span className={styles.metaText}>{shiftLabel}</span>
              </div>
            </div>
          </div>

          <div className={styles.quickActions}>
            {resolvedQuickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={item.tone === 'primary' ? styles.quickActionPrimary : styles.quickAction}
                onClick={() => setIsSidebarOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </header>

        {metrics.length > 0 && (
          <section className={styles.metricStrip}>
            {metrics.map((metric) => (
              <article key={`${metric.label}-${metric.value}`} className={`${styles.metricCard} ${metricToneClass(metric.tone)}`}>
                <p>{metric.label}</p>
                <strong>{metric.value}</strong>
                {metric.hint ? <span>{metric.hint}</span> : null}
              </article>
            ))}
          </section>
        )}

        <section className={styles.contentCard}>{children}</section>
      </section>
    </div>
  );
}
