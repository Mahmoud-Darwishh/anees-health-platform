'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Reveal } from '@/components/common/Reveal';
import styles from './sectionOurServices.module.scss';

/* ── Service definitions ─────────────────────────────────────────── */

const HERO_SERVICE = {
  id: 'elderlyCare',
  icon: 'isax isax-heart-add',
  slug: 'elderly-care-at-home',
} as const;

const SERVICES: ReadonlyArray<{ id: string; icon: string; slug?: string }> = [
  { id: 'doctorVisits',  icon: 'isax isax-health',          slug: 'doctor-at-home' },
  { id: 'nursingCare',   icon: 'isax isax-hospital' },
  { id: 'physiotherapy', icon: 'isax isax-activity',        slug: 'physiotherapy-at-home' },
  { id: 'telemedicine',  icon: 'isax isax-global' },
  { id: 'labTests',      icon: 'isax isax-clipboard-text' },
];

/* ── Component ───────────────────────────────────────────────────── */

export default function SectionOurServices() {
  const t = useTranslations('home');
  const locale = useLocale();

  type TKey = Parameters<typeof t>[0];
  const svc = (id: string, field: string) =>
    t(`servicesPage.items.${id}.${field}` as TKey);
  const features = (id: string) => {
    const raw = t.raw(`servicesPage.items.${id}.features` as TKey);
    return Array.isArray(raw) ? (raw as string[]) : [];
  };

  return (
    <Reveal as="section" className={styles.section}>
      <div className="container">
        {/* ── Section header ───────────────────────────────── */}
        <div className={styles.header}>
          <span className={styles.badge}>{t('ourServices.label')}</span>
          <h2 className={styles.heading}>{t('ourServices.heading')}</h2>
          <p className={styles.subtitle}>{t('ourServices.description')}</p>
        </div>

        {/* ── Hero card — flagship service ─────────────────── */}
        <Link
          href={`/${locale}/services/${HERO_SERVICE.slug}`}
          className={styles.hero}
        >
          <div className={styles.heroIcon}>
            <i className={HERO_SERVICE.icon} />
          </div>
          <div className={styles.heroBody}>
            <h3 className={styles.heroTitle}>
              {svc(HERO_SERVICE.id, 'title')}
            </h3>
            <p className={styles.heroDesc}>
              {svc(HERO_SERVICE.id, 'description')}
            </p>
            <ul className={styles.heroFeatures}>
              {features(HERO_SERVICE.id).map((f) => (
                <li key={f}>
                  <i className="isax isax-tick-circle" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <span className={styles.heroArrow} aria-hidden="true">
            <i className="fa-solid fa-arrow-right" />
          </span>
        </Link>

        {/* ── Service cards grid ──────────────────────────── */}
        <div className={styles.grid}>
          {SERVICES.map((s) => {
            const href = s.slug
              ? `/${locale}/services/${s.slug}`
              : undefined;

            const inner = (
              <>
                <span className={styles.cardIcon} aria-hidden="true">
                  <i className={s.icon} />
                </span>
                <h3 className={styles.cardTitle}>
                  {svc(s.id, 'title')}
                </h3>
                <p className={styles.cardDesc}>
                  {svc(s.id, 'shortDesc')}
                </p>
                {href && (
                  <span className={styles.cardArrow}>
                    {t('ourServices.learnMore')}
                    <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                  </span>
                )}
              </>
            );

            return href ? (
              <Link
                key={s.id}
                href={href}
                className={`${styles.card} ${styles.cardLinked}`}
              >
                {inner}
              </Link>
            ) : (
              <div key={s.id} className={styles.card}>
                {inner}
              </div>
            );
          })}
        </div>

        {/* ── CTA ─────────────────────────────────────────── */}
        <div className={styles.cta}>
          <Link href={`/${locale}/services`} className={styles.ctaBtn}>
            {t('ourServices.viewAll')}
            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Reveal>
  );
}
