'use client';

import Image from 'next/image';
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

const HOME_HREF = '/en';

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

const PHYSIO_UTILITY_ITEMS: NavItem[] = [
  { href: '/admin/physio', label: 'Physio Workspace', shortLabel: 'PW' },
  { href: '/admin/patients', label: 'My Cases', shortLabel: 'PT' },
];

const PHYSIO_NAV_SECTIONS: NavSection[] = [
  {
    title: 'Workspace',
    items: [
      { href: '/admin/physio', label: 'Physio Workspace', shortLabel: 'PW' },
      { href: '/admin/patients', label: 'My Cases', shortLabel: 'PT' },
    ],
  },
  {
    title: 'Clinical Work',
    items: [{ href: '/admin/patients', label: 'Session Reporting & EHR', shortLabel: 'EH' }],
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

function parseMetricNumber(value: string | number): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;

  const compact = value.replace(/,/g, '');
  const matched = compact.match(/-?\d+(?:\.\d+)?/);
  if (!matched) return null;

  const parsed = Number(matched[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function computeGreetingHourLabel(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

function resolvePersonalName(staffName: string | undefined, roleLabel: string | null | undefined): string {
  const fallback = 'Clinician';
  const raw = staffName?.trim();
  if (!raw) return fallback;

  if (/^dr\.?\s+/i.test(raw)) return raw;
  const firstToken = raw.split(/\s+/)[0] ?? raw;
  const isDoctor = (roleLabel ?? '').toLowerCase().includes('doctor');
  return isDoctor ? `Dr. ${firstToken}` : firstToken;
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
  const isPhysiotherapist = (roleLabel ?? '').toLowerCase() === 'physiotherapist';

  const roleAwareUtilityItems = useMemo<NavItem[]>(
    () => (isPhysiotherapist ? PHYSIO_UTILITY_ITEMS : UTILITY_ITEMS),
    [isPhysiotherapist],
  );

  const roleAwareSections = useMemo<NavSection[]>(
    () => (isPhysiotherapist ? PHYSIO_NAV_SECTIONS : NAV_SECTIONS),
    [isPhysiotherapist],
  );

  const resolvedQuickLinks = useMemo<ShellQuickLink[]>(() => {
    const defaults: ShellQuickLink[] = isPhysiotherapist
      ? [
          { href: '/admin/physio', label: 'Physio Workspace', tone: 'primary' },
          { href: '/admin/patients', label: 'My Cases' },
        ]
      : [
          { href: '/admin/patients', label: 'Patient Registry' },
          { href: '/admin/queues', label: 'Open Queues' },
          { href: '/admin/dashboards', label: 'Dashboard Hub', tone: 'primary' },
        ];

    const base = quickLinks && quickLinks.length > 0 ? quickLinks : defaults;
    const hasHome = base.some((item) => item.href === '/' || item.href === '/en' || item.href === '/ar');

    return hasHome ? base : [{ href: HOME_HREF, label: 'Back to Home' }, ...base];
  }, [isPhysiotherapist, quickLinks]);

  const filteredSections = useMemo<NavSection[]>(() => {
    const term = navQuery.trim().toLowerCase();
    if (!term) return roleAwareSections;

    return roleAwareSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.label.toLowerCase().includes(term)),
      }))
      .filter((section) => section.items.length > 0);
  }, [navQuery, roleAwareSections]);

  const shiftLabel = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo',
  }).format(new Date());

  const greetingSummary = useMemo(() => {
    const now = new Date();
    const cairoHour = Number(
      new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        hour12: false,
        timeZone: 'Africa/Cairo',
      }).format(now),
    );

    const hour = Number.isFinite(cairoHour) ? cairoHour : now.getHours();
    const greetingPeriod = computeGreetingHourLabel(hour);
    const greeting = `Good ${greetingPeriod}`;
    const professionalName = resolvePersonalName(staffName, roleLabel);

    const numericMetrics = metrics
      .map((metric) => ({
        ...metric,
        numericValue: parseMetricNumber(metric.value),
      }))
      .filter((metric): metric is ShellMetric & { numericValue: number } => metric.numericValue !== null);

    const totalLoad = numericMetrics.reduce((sum, metric) => sum + metric.numericValue, 0);
    const highestPressure = numericMetrics.reduce<(ShellMetric & { numericValue: number }) | null>(
      (max, metric) => {
        if (!max || metric.numericValue > max.numericValue) return metric;
        return max;
      },
      null,
    );
    const activeLanes = numericMetrics.filter((metric) => metric.numericValue > 0).length;

    const insights = [
      `${activeLanes}/${Math.max(numericMetrics.length, 1)} tracked lanes active now`,
      highestPressure
        ? `Highest pressure: ${highestPressure.label} (${highestPressure.numericValue})`
        : 'Highest pressure: no numeric load yet',
      `Operational load: ${totalLoad} items currently on radar`,
    ];

    return {
      greeting,
      professionalName,
      insights,
    };
  }, [metrics, roleLabel, staffName]);

  return (
    <div className={styles.frame}>
      <div
        className={`${styles.overlay} ${isSidebarOpen ? styles.overlayVisible : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      <aside className={styles.utilityRail}>
        <Link href={HOME_HREF} className={styles.brandMark} aria-label="Anees home">
          <Image src="/assets/img/anees-logo.png" alt="Anees" width={34} height={34} />
        </Link>

        <nav className={styles.utilityList}>
          {roleAwareUtilityItems.map((item) => (
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
          <Link href={HOME_HREF} className={styles.sidebarBrand}>
            <Image src="/assets/img/footer-logo.png" alt="Anees" width={94} height={30} />
            <span>Admin</span>
          </Link>
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
            placeholder={isPhysiotherapist ? 'Type workspace, cases...' : 'Type doctor, queues, audit...'}
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
            <div className={styles.brandRow}>
              <Link href={HOME_HREF} className={styles.inlineBrand}>
                <Image src="/assets/img/anees-logo.png" alt="Anees" width={26} height={26} />
                <span>Anees Admin</span>
              </Link>
              <Link href={HOME_HREF} className={styles.homeLink}>
                Back to Home
              </Link>
            </div>
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
              <p className={styles.welcomeLine}>
                {greetingSummary.greeting}, {greetingSummary.professionalName}.
              </p>
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
          <>
            <section className={styles.metricStrip}>
              {metrics.map((metric) => (
                <article key={`${metric.label}-${metric.value}`} className={`${styles.metricCard} ${metricToneClass(metric.tone)}`}>
                  <p>{metric.label}</p>
                  <strong>{metric.value}</strong>
                  {metric.hint ? <span>{metric.hint}</span> : null}
                </article>
              ))}
            </section>

            <section className={styles.insightStrip} aria-label="Operational insights">
              {greetingSummary.insights.map((insight) => (
                <article key={insight} className={styles.insightCard}>
                  <p>{insight}</p>
                </article>
              ))}
            </section>
          </>
        )}

        <section className={styles.contentCard}>{children}</section>
      </section>
    </div>
  );
}
