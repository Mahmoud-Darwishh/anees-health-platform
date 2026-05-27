'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Reveal } from '@/components/common/Reveal';
import { useCarouselAutoplay } from '@/hooks/useCarouselAutoplay';
import styles from './sectionPackages.module.scss';
import LucideIcon from '@/components/common/LucideIcon';

type PackageData = {
  tagline?: string;
  nameEn: string;
  nameAr: string;
  duration?: string;
  focus?: string;
  features: string[];
};

const SectionPackages: React.FC = () => {
  const t = useTranslations('home.packages');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  // ── Sanad data ─────────────────────────────────────────────────────────────
  const sanad = t.raw('sanad') as {
    tagline: string;
    nameEn: string;
    nameAr: string;
    price_3m: string;
    price_12m: string;
    features: string[];
  };

  // ── Other packages ─────────────────────────────────────────────────────────
  const packageIds = useMemo(() => ['haraka', 'wai', 'amal'] as const, []);
  const packages = useMemo(
    () =>
      packageIds.map((packageId) => ({
        id: packageId,
        pkg: t.raw(packageId) as PackageData,
      })),
    [packageIds, t]
  );

  // Mobile gate for autoplay (desktop shows the grid all at once).
  useEffect(() => {
    const media = window.matchMedia('(max-width: 991px)');
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = 'smooth') => {
      const slider = sliderRef.current;
      if (!slider) return;
      const slide = slider.querySelectorAll<HTMLElement>(`.${styles.packageSlide}`)[index];
      if (!slide) return;
      slider.scrollTo({ left: slide.offsetLeft, behavior });
    },
    []
  );

  const { activeIndex, setActiveIndex, pause, scheduleResume } = useCarouselAutoplay({
    total: packages.length,
    autoplayMs: 4500,
    resumeDelayMs: 1800,
    enabled: isMobile,
    onAdvance: (next) => scrollToIndex(next, 'smooth'),
  });

  // Reset to first slide when leaving mobile.
  useEffect(() => {
    if (!isMobile) setActiveIndex(0);
  }, [isMobile, setActiveIndex]);

  // Sync activeIndex from native scroll position (mobile only).
  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || !isMobile) return;
    let rafId = 0;
    const updateActiveFromScroll = () => {
      const slides = Array.from(slider.querySelectorAll<HTMLElement>(`.${styles.packageSlide}`));
      if (!slides.length) return;
      const viewportCenter = slider.scrollLeft + slider.clientWidth / 2;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;
      slides.forEach((slide, index) => {
        const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
        const distance = Math.abs(viewportCenter - slideCenter);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });
      setActiveIndex(closestIndex);
    };
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateActiveFromScroll);
    };
    slider.addEventListener('scroll', onScroll, { passive: true });
    updateActiveFromScroll();
    return () => {
      slider.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isMobile, setActiveIndex]);

  return (
    <Reveal as="section" className={styles.section} id="packages">
      <div className="container">

        {/* Section header */}
        <div className={styles.header}>
          <span className={styles.badge}>{t('badge')}</span>
          <h2 className={styles.heading}>{t('title')}</h2>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>

        {/* ── Sanad — flagship card ───────────────────────────────────────── */}
        <div className={styles.sanadWrapper}>
          <article className={styles.sanadCard} aria-labelledby="sanad-name">
            {/* Left — identity + features */}
            <div className={styles.sanadLeft}>
              <span className={styles.sanadFlag}>{t('sanad_badge')}</span>

              <h3 id="sanad-name" className={styles.sanadName}>
                <span className={styles.sanadNameEn}>{sanad.nameEn}</span>
                <span className={styles.sanadNameAr}>{sanad.nameAr}</span>
              </h3>

              <p className={styles.sanadTagline}>{sanad.tagline}</p>

              <div className={styles.sanadHero}>
                <LucideIcon iconClass="fa-solid fa-user-group" aria-hidden="true" />
                <span>{t('sanad_main_tagline')}</span>
              </div>

              <p className={styles.sanadSubTagline}>{t('sanad_sub_tagline')}</p>

              <ul className={styles.sanadFeatures}>
                {sanad.features.map((feature, i) => (
                  <li key={i} className={styles.sanadFeature}>
                    <LucideIcon iconClass="fa-solid fa-circle-check" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — pricing + CTA */}
            <div className={styles.sanadRight}>
              <div className={styles.pricingPanel}>
                <p className={styles.pricingLabel}>{t('pricing_label')}</p>

                <div className={styles.plan}>
                  <div className={styles.planLeft}>
                    <span className={styles.planDuration}>{t('sanad_plan_3m_label')}</span>
                  </div>
                  <div className={styles.planRight}>
                    <span className={styles.planAmount}>{sanad.price_3m}</span>
                    <span className={styles.planCurrency}>{t('sanad_currency')}</span>
                  </div>
                </div>

                <div className={`${styles.plan} ${styles.planFeatured}`}>
                  <div className={styles.planLeft}>
                    <span className={styles.planDuration}>{t('sanad_plan_12m_label')}</span>
                    <span className={styles.planSavings}>{t('sanad_plan_12m_savings')}</span>
                  </div>
                  <div className={styles.planRight}>
                    <span className={styles.planAmount}>{sanad.price_12m}</span>
                    <span className={styles.planCurrency}>{t('sanad_currency')}</span>
                  </div>
                </div>

                <Link
                  href={`/${locale}/booking?package=sanad`}
                  className={styles.sanadCta}
                  aria-label={t('sanad_cta_aria')}
                >
                  <LucideIcon iconClass="fa-solid fa-calendar-check" aria-hidden="true" />
                  {t('sanad_cta')}
                </Link>

                <p className={styles.contactNote}>{t('sanad_contact_note')}</p>
              </div>
            </div>
          </article>
        </div>

        {/* ── Sub-section divider for condition-specific packages ──────────── */}
        <div className={styles.subHeader}>
          <span className={styles.subDivider} aria-hidden="true" />
          <span className={styles.subLabel}>{t('other_packages_label')}</span>
          <span className={styles.subDivider} aria-hidden="true" />
        </div>

        {/* ── 3 condition packages ─────────────────────────────────────────── */}
        <div
          ref={sliderRef}
          className={styles.packagesGrid}
          aria-label={t('title')}
          onTouchStart={pause}
          onTouchEnd={() => scheduleResume()}
          onMouseEnter={pause}
          onMouseLeave={() => scheduleResume(500)}
          onFocus={pause}
          onBlur={() => scheduleResume()}
        >
          {packages.map(({ id, pkg }) => (
            <div key={id} className={styles.packageSlide}>
              <div className={styles.packageCard}>
                {pkg.tagline && (
                  <p className={styles.packageTagline}>{pkg.tagline}</p>
                )}
                <h3 className={styles.packageName}>
                  <span className={styles.packageNameEn}>{pkg.nameEn}</span>
                  <span className={styles.packageNameAr}>{pkg.nameAr}</span>
                </h3>
                {pkg.duration && (
                  <p className={styles.packageDuration}>{pkg.duration}</p>
                )}

                <div className={styles.packageDivider} />

                {pkg.focus && (
                  <p className={styles.packageFocus}>{pkg.focus}</p>
                )}

                <ul className={styles.packageFeatures}>
                  {pkg.features.map((feature, index) => (
                    <li key={index} className={styles.packageFeature}>
                      <LucideIcon iconClass="fa-solid fa-circle-check" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/${locale}/booking?package=${id}`}
                  className={styles.packageCta}
                  aria-label={`${t('book_now')} ${pkg.nameEn} ${pkg.nameAr}`}
                >
                  {t('book_now')}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile dots */}
        <div
          className={styles.dots}
          role="tablist"
          aria-label={t('dots_aria')}
        >
          {packages.map(({ id, pkg }, index) => (
            <button
              key={`dot-${id}`}
              type="button"
              className={`${styles.dot} ${index === activeIndex ? styles.dotActive : ''}`}
              aria-label={t('go_to_package', { name: isRTL ? pkg.nameAr : pkg.nameEn })}
              aria-selected={index === activeIndex}
              role="tab"
              onClick={() => {
                pause();
                scrollToIndex(index);
                setActiveIndex(index);
                scheduleResume();
              }}
            />
          ))}
        </div>

        {/* Footer CTA */}
        <div className={styles.footerCta}>
          <p className={styles.footerNote}>{t('contact_note')}</p>
          <Link
            href={`/${locale}/contact-us`}
            className={styles.contactBtn}
            aria-label={t('contact_us_aria')}
          >
            {t('contact_us')}
            <LucideIcon iconClass="fa-solid fa-arrow-right" aria-hidden="true" />
          </Link>
        </div>

      </div>
    </Reveal>
  );
};

export default SectionPackages;

