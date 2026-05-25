'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ExportPdfButton } from './ExportPdfButton';
import styles from './PortalShell.module.scss';

export type PortalSectionItem = {
  /** Stable URL-safe id used in `#hash` and as React key. */
  id: string;
  /** Sidebar label (already translated). */
  label: string;
  /** Optional feather icon class — kept inline & decorative. */
  icon?: string;
  /** Optional numeric badge shown to the right of the label. */
  count?: number;
  /** Section body — server-rendered ReactNode. */
  content: ReactNode;
};

type PortalShellProps = {
  sections: PortalSectionItem[];
  /** Section id to show on first load (defaults to the first section). */
  defaultSectionId?: string;
  /** Accessible label for the sidebar nav. */
  navLabel: string;

  // ── Sidebar branding & user header ─────────────────────────────────────────
  logoSrc: string;
  logoAlt: string;
  brandHref: string;

  greetingLine: string;
  patientName: string;

  // ── Sidebar footer actions ─────────────────────────────────────────────────
  homeHref: string;
  homeLabel: string;
  exportPdfLabel: string;

  // ── Locale switcher ────────────────────────────────────────────────────────
  /** Href to the same page under the alternate locale. */
  switchLocaleHref: string;
  /** Native label for the alternate locale (e.g. "العربية" or "English"). */
  switchLocaleLabel: string;

  /** Top-of-content slot (status notices, etc.) */
  notices?: ReactNode;
  /** Below-notices slot (hero, page heading). */
  header?: ReactNode;
};

/**
 * Full-height patient portal shell.
 *
 * - Fixed-width white sidebar pinned to the left edge of the page.
 * - Sidebar contains logo, time-of-day greeting, section nav, home link, export-PDF button.
 * - Main column holds optional notices, an optional hero/header, then the active section.
 * - Active section id is mirrored to the URL `#hash` so refresh / deep-links keep state.
 *
 * Pure presentational client component — no PHI fetching, no data state.
 */
export function PortalShell({
  sections,
  defaultSectionId,
  navLabel,
  logoSrc,
  logoAlt,
  brandHref,
  greetingLine,
  patientName,
  homeHref,
  homeLabel,
  exportPdfLabel,
  switchLocaleHref,
  switchLocaleLabel,
  notices,
  header,
}: PortalShellProps) {
  const initialId = useMemo(() => {
    const fallback = defaultSectionId ?? sections[0]?.id ?? '';
    if (typeof window === 'undefined') return fallback;
    const hash = window.location.hash.replace(/^#/, '');
    return sections.some((section) => section.id === hash) ? hash : fallback;
  }, [defaultSectionId, sections]);

  const [activeId, setActiveId] = useState(initialId);

  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.replace(/^#/, '');
      if (sections.some((section) => section.id === hash)) {
        setActiveId(hash);
      }
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [sections]);

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', `#${id}`);
    }
  }, []);

  const activeSection = sections.find((section) => section.id === activeId) ?? sections[0];

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} aria-label={navLabel}>
        <div className={styles.sidebarInner}>
          <Link href={brandHref} className={styles.brand} aria-label={logoAlt}>
            <Image
              src={logoSrc}
              alt={logoAlt}
              width={120}
              height={40}
              priority
              className={styles.brandLogo}
            />
          </Link>

          <Link
            href={switchLocaleHref}
            className={styles.localeSwitch}
            aria-label={switchLocaleLabel}
            prefetch={false}
          >
            <i className="feather-globe" aria-hidden="true" />
            <span>{switchLocaleLabel}</span>
          </Link>

          <div className={styles.greeting}>
            <p className={styles.greetingLine}>{greetingLine}</p>
            <p className={styles.greetingName}>{patientName}</p>
          </div>

          <nav className={styles.nav}>
            {sections.map((section) => {
              const isActive = section.id === activeSection?.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  className={
                    isActive
                      ? `${styles.navItem} ${styles.navItemActive}`
                      : styles.navItem
                  }
                  onClick={() => handleSelect(section.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {section.icon ? (
                    <span className={styles.navIcon} aria-hidden="true">
                      <i className={section.icon} />
                    </span>
                  ) : null}
                  <span className={styles.navLabel}>{section.label}</span>
                  {typeof section.count === 'number' && section.count > 0 ? (
                    <span className={styles.navBadge} aria-hidden="true">
                      {section.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <ExportPdfButton label={exportPdfLabel} className={styles.exportBtn} />
            <Link href={homeHref} className={styles.homeBtn}>
              <i className="feather-home" aria-hidden="true" />
              <span>{homeLabel}</span>
            </Link>
          </div>
        </div>
      </aside>

      <div className={styles.main}>
        {/* Print-only header — sidebar is hidden in PDFs, so re-brand the export here. */}
        <div className={styles.printHeader} aria-hidden="true">
          <Image
            src={logoSrc}
            alt=""
            width={120}
            height={40}
            className={styles.printHeaderLogo}
          />
          <div className={styles.printHeaderMeta}>
            <p className={styles.printHeaderName}>{patientName}</p>
            <p className={styles.printHeaderLine}>{greetingLine}</p>
          </div>
        </div>

        {notices ? <div className={styles.notices}>{notices}</div> : null}
        {header ? <div className={styles.header}>{header}</div> : null}
        <div className={styles.content} role="region" aria-live="polite">
          {sections.map((section) => {
            const isActive = section.id === activeSection?.id;
            return (
              <section
                key={section.id}
                className={
                  isActive
                    ? styles.section
                    : `${styles.section} ${styles.sectionHidden}`
                }
                aria-hidden={isActive ? undefined : true}
                data-section-id={section.id}
              >
                <h2 className={styles.printSectionTitle}>{section.label}</h2>
                {section.content}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
