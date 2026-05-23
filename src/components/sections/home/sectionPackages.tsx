'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

const SectionPackages: React.FC = () => {
  const t = useTranslations('home.packages');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const sliderRef = useRef<HTMLDivElement>(null);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // ── Sanad data ─────────────────────────────────────────────────────────────
  const sanad = t.raw('sanad') as {
    tagline: string;
    nameEn: string;
    nameAr: string;
    price_3m: string;
    price_12m: string;
    features: string[];
  };

  // ── Existing packages ──────────────────────────────────────────────────────
  const packageIds = ['haraka', 'wai', 'amal'] as const;
  const packageThemes = { haraka: 'package-light', wai: 'package-dark', amal: 'package-light' };
  const packages = useMemo(
    () =>
      packageIds.map((packageId) => ({
        id: packageId,
        pkg: t.raw(packageId),
        className: packageThemes[packageId],
      })),
    [t]
  );
  const isAtFirstSlide = activeIndex === 0;
  const isAtLastSlide = activeIndex === packages.length - 1;

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const slider = sliderRef.current;
    if (!slider) return;
    const slide = slider.querySelectorAll<HTMLElement>('.package-slide-col')[index];
    if (!slide) return;
    slider.scrollTo({ left: slide.offsetLeft, behavior });
    setActiveIndex(index);
  }, []);

  const pauseAutoScroll = useCallback(() => {
    setIsPaused(true);
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }, []);

  const resumeAutoScroll = useCallback((delay = 1800) => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => setIsPaused(false), delay);
  }, []);

  useEffect(() => {
    const mobileMedia = window.matchMedia('(max-width: 767px)');
    const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyMediaState = () => {
      setIsMobile(mobileMedia.matches);
      setPrefersReducedMotion(reducedMotionMedia.matches);
    };
    applyMediaState();
    mobileMedia.addEventListener('change', applyMediaState);
    reducedMotionMedia.addEventListener('change', applyMediaState);
    return () => {
      mobileMedia.removeEventListener('change', applyMediaState);
      reducedMotionMedia.removeEventListener('change', applyMediaState);
    };
  }, []);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || !isMobile) { setActiveIndex(0); return; }
    let rafId = 0;
    const updateActiveFromScroll = () => {
      const slides = Array.from(slider.querySelectorAll<HTMLElement>('.package-slide-col'));
      if (!slides.length) return;
      const viewportCenter = slider.scrollLeft + slider.clientWidth / 2;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;
      slides.forEach((slide, index) => {
        const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
        const distance = Math.abs(viewportCenter - slideCenter);
        if (distance < closestDistance) { closestDistance = distance; closestIndex = index; }
      });
      setActiveIndex(closestIndex);
    };
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateActiveFromScroll);
    };
    slider.addEventListener('scroll', onScroll, { passive: true });
    updateActiveFromScroll();
    return () => { slider.removeEventListener('scroll', onScroll); if (rafId) cancelAnimationFrame(rafId); };
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || isPaused || prefersReducedMotion || packages.length < 2) return;
    const intervalId = setInterval(() => {
      const nextIndex = (activeIndex + 1) % packages.length;
      scrollToIndex(nextIndex, 'smooth');
    }, 4500);
    return () => clearInterval(intervalId);
  }, [activeIndex, isMobile, isPaused, packages.length, prefersReducedMotion, scrollToIndex]);

  useEffect(() => {
    return () => { if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current); };
  }, []);

  return (
    <section className="packages-section" id="packages">
      <div className="container">

        {/* Section header */}
        <div className="section-header sec-header-one text-center">
          <span className="badge badge-primary">{t('badge')}</span>
          <h2>{t('title')}</h2>
          <p className="section-subtitle">{t('subtitle')}</p>
        </div>

        {/* ── Sanad — Featured Flagship Card ───────────────────────────────── */}
        <div className="sanad-wrapper">
          <div className="sanad-card">
            {/* Gold shimmer top bar */}
            <div className="sanad-shimmer" aria-hidden="true" />

            <div className="row g-0 align-items-stretch">

              {/* Left — Identity + Features */}
              <div className="col-lg-7">
                <div className="sanad-left">
                  <h3 className="sanad-name">
                    <span className="sanad-name-en">{sanad.nameEn}</span>
                    {' '}
                    <span className="sanad-name-ar">{sanad.nameAr}</span>
                  </h3>

                  <p className="sanad-tagline-text">{sanad.tagline}</p>

                  <div className="sanad-main-tagline">
                    <i className="isax isax-profile-2user" aria-hidden="true" />
                    <span>{t('sanad_main_tagline')}</span>
                  </div>

                  <p className="sanad-sub-tagline">{t('sanad_sub_tagline')}</p>

                  <ul className="sanad-features">
                    {sanad.features.map((feature: string, i: number) => (
                      <li key={i} className="sanad-feature">
                        <i className="isax isax-tick-circle" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right — Pricing + CTA */}
              <div className="col-lg-5">
                <div className="sanad-right">
                  <div className="sanad-pricing-inner">

                    <p className="sanad-pricing-label">{isRTL ? 'اختر خطتك' : 'Choose your plan'}</p>

                    {/* 3-Month Plan */}
                    <div className="sanad-plan">
                      <div className="sanad-plan-header">
                        <span className="sanad-plan-duration">{t('sanad_plan_3m_label')}</span>
                      </div>
                      <div className="sanad-plan-price">
                        <span className="sanad-plan-amount">{sanad.price_3m}</span>
                        <span className="sanad-plan-currency">{t('sanad_currency')}</span>
                      </div>
                    </div>

                    {/* 12-Month Plan */}
                    <div className="sanad-plan sanad-plan--featured">
                      <div className="sanad-plan-header">
                        <span className="sanad-plan-duration">{t('sanad_plan_12m_label')}</span>
                        <span className="sanad-plan-savings">{t('sanad_plan_12m_savings')}</span>
                      </div>
                      <div className="sanad-plan-price">
                        <span className="sanad-plan-amount">{sanad.price_12m}</span>
                        <span className="sanad-plan-currency">{t('sanad_currency')}</span>
                      </div>
                    </div>

                    <Link
                      href={`/${locale}/booking?package=sanad`}
                      className="btn-sanad"
                      aria-label={t('sanad_cta_aria')}
                    >
                      <i className="isax isax-calendar-tick" aria-hidden="true" />
                      {t('sanad_cta')}
                    </Link>

                    <p className="sanad-contact-note">
                      {isRTL
                        ? 'لمزيد من التفاصيل تواصل معنا مباشرةً'
                        : 'Questions? Contact us directly'}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Bridge to condition-specific packages ─────────────────────────── */}
        <div className="packages-sub-header">
          <span className="packages-sub-divider" aria-hidden="true" />
          <span className="packages-sub-label">{t('other_packages_label')}</span>
          <span className="packages-sub-divider" aria-hidden="true" />
        </div>

        {/* ── Haraka / Wai / Amal slider ────────────────────────────────────── */}
        <div
          ref={sliderRef}
          className={`row g-4 packages-slider-row ${isAtFirstSlide ? 'is-at-first' : ''} ${isAtLastSlide ? 'is-at-last' : ''}`}
          aria-label={t('title')}
          onTouchStart={pauseAutoScroll}
          onTouchEnd={() => resumeAutoScroll()}
          onMouseEnter={pauseAutoScroll}
          onMouseLeave={() => resumeAutoScroll(500)}
          onFocus={pauseAutoScroll}
          onBlur={() => resumeAutoScroll()}
        >
          {packages.map(({ id, pkg, className }) => (
            <div key={id} className="col-lg-4 col-md-6 col-12 package-slide-col">
              <div className={`package-card ${className}`}>
                <div className="package-header">
                  <p className="package-tagline">{pkg.tagline}</p>
                  <h3 className="package-name">
                    <span className="name-en">{pkg.nameEn}</span>
                    {' '}
                    <span className="name-ar">{pkg.nameAr}</span>
                  </h3>
                  <p className="package-duration">{pkg.duration}</p>
                </div>

                <div className="package-divider" />

                <div className="package-focus">{pkg.focus}</div>

                <ul className="package-features">
                  {pkg.features.map((feature: string, index: number) => (
                    <li key={index} className="package-feature">
                      <i className="isax isax-tick-circle" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="package-footer">
                  <Link
                    href={`/${locale}/booking?package=${id}`}
                    className="btn btn-package"
                    aria-label={`${t('book_now')} ${pkg.nameEn} ${pkg.nameAr}`}
                  >
                    {t('book_now')}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Slider dots (mobile) */}
        <div
          className="packages-slider-dots"
          role="tablist"
          aria-label={isRTL ? 'مؤشر التنقل بين الباقات' : 'Package slider navigation'}
        >
          {packages.map(({ id, pkg }, index) => (
            <button
              key={`dot-${id}`}
              type="button"
              className={`packages-slider-dot ${index === activeIndex ? 'is-active' : ''}`}
              aria-label={isRTL ? `الانتقال إلى باقة ${pkg.nameAr}` : `Go to ${pkg.nameEn} package`}
              aria-selected={index === activeIndex}
              onClick={() => { pauseAutoScroll(); scrollToIndex(index); resumeAutoScroll(); }}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center package-cta">
          <p className="package-note">{t('contact_note')}</p>
          <Link
            href={`/${locale}/contact-us`}
            className="btn btn-dark"
            aria-label={t('contact_us_aria')}
          >
            {t('contact_us')}
            <i className="isax isax-arrow-right-3 ms-2" />
          </Link>
        </div>

      </div>
    </section>
  );
};

export default SectionPackages;
