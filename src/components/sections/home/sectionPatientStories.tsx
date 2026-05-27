'use client';

import React, { useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Reveal } from '@/components/common/Reveal';
import { useCarouselAutoplay } from '@/hooks/useCarouselAutoplay';
import styles from './sectionPatientStories.module.scss';
import LucideIcon from '@/components/common/LucideIcon';

// NOTE: The quotes in `home.patientStories.items` are placeholder content
// approved for launch staging. Replace with real, consented patient/family
// testimonials before going live — fabricated medical testimonials carry
// regulatory and trust risk.

type Story = {
  quote: string;
  name: string;
  relation: string;
  location: string;
};

const AUTOPLAY_MS = 5500;
const RESUME_DELAY_MS = 4000;

const SectionPatientStories: React.FC = () => {
  const t = useTranslations('home.patientStories');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const items = t.raw('items') as Story[];

  const touchStartRef = useRef<number | null>(null);

  const total = items.length;

  const { activeIndex, setActiveIndex, pause, scheduleResume } = useCarouselAutoplay({
    total,
    autoplayMs: AUTOPLAY_MS,
    resumeDelayMs: RESUME_DELAY_MS,
  });

  const goTo = useCallback(
    (index: number) => {
      if (total === 0) return;
      const next = ((index % total) + total) % total;
      setActiveIndex(next);
    },
    [total, setActiveIndex]
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex]);

  // Keyboard arrows on the carousel region
  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (isRTL) goPrev();
      else goNext();
      pause();
      scheduleResume();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (isRTL) goNext();
      else goPrev();
      pause();
      scheduleResume();
    }
  };

  // Touch swipe
  const onTouchStart: React.TouchEventHandler = (e) => {
    touchStartRef.current = e.touches[0].clientX;
    pause();
  };
  const onTouchEnd: React.TouchEventHandler = (e) => {
    if (touchStartRef.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current;
    touchStartRef.current = null;
    const THRESHOLD = 40;
    if (Math.abs(dx) > THRESHOLD) {
      const movedRight = dx > 0;
      if (isRTL ? !movedRight : movedRight) goPrev();
      else goNext();
    }
    scheduleResume();
  };

  // Track translate value (RTL flips direction)
  const translateValue = `${(isRTL ? 1 : -1) * activeIndex * 100}%`;

  if (total === 0) return null;

  return (
    <Reveal as="section" className={styles.section} aria-labelledby="patient-stories-title">
      <div className="container">
        <div className={styles.header}>
          <span className={styles.badge}>{t('badge')}</span>
          <h2 id="patient-stories-title" className={styles.heading}>
            {t('title')}
          </h2>
          <p className={styles.subtitle}>{t('subtitle')}</p>
        </div>

        <div
          className={styles.carousel}
          role="region"
          aria-roledescription="carousel"
          aria-label={t('title')}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseEnter={pause}
          onMouseLeave={() => scheduleResume()}
          onFocus={pause}
          onBlur={() => scheduleResume()}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className={styles.viewport} aria-live="polite">
            <div
              className={styles.track}
              style={{ transform: `translateX(${translateValue})` }}
            >
              {items.map((story, i) => {
                const isActive = i === activeIndex;
                return (
                  <figure
                    key={i}
                    className={styles.slide}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${i + 1} / ${total}`}
                    aria-hidden={!isActive}
                  >
                    <div className={styles.card}>
                      <span className={styles.quoteMark} aria-hidden="true">
                        &ldquo;
                      </span>
                      <blockquote className={styles.quote}>
                        <p>{story.quote}</p>
                      </blockquote>

                      <figcaption className={styles.attribution}>
                        <span className={styles.avatar} aria-hidden="true">
                          {story.name.charAt(0)}
                        </span>
                        <span className={styles.attributionText}>
                          <span className={styles.name}>{story.name}</span>
                          <span className={styles.meta}>
                            {story.relation} · {story.location}
                          </span>
                        </span>
                      </figcaption>
                    </div>
                  </figure>
                );
              })}
            </div>
          </div>

          {total > 1 && (
            <>
              <button
                type="button"
                className={`${styles.navBtn} ${styles.navPrev}`}
                onClick={() => {
                  goPrev();
                  pause();
                  scheduleResume();
                }}
                aria-label={t('prev')}
              >
                <LucideIcon iconClass="fa-solid fa-arrow-left" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${styles.navBtn} ${styles.navNext}`}
                onClick={() => {
                  goNext();
                  pause();
                  scheduleResume();
                }}
                aria-label={t('next')}
              >
                <LucideIcon iconClass="fa-solid fa-arrow-right" aria-hidden="true" />
              </button>

              <div className={styles.dots} role="tablist" aria-label={t('title')}>
                {items.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === activeIndex}
                    aria-label={`${t('goTo')} ${i + 1}`}
                    className={`${styles.dot} ${
                      i === activeIndex ? styles.dotActive : ''
                    }`}
                    onClick={() => {
                      goTo(i);
                      pause();
                      scheduleResume();
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Reveal>
  );
};

export default SectionPatientStories;

