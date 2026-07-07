'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './MobileBottomNav.module.scss';
import LucideIcon from '@/components/common/LucideIcon';

/**
 * Mobile Bottom Navigation Bar - Advanced Elite Design
 * 
 * Premium Features:
 * - Advanced animations: morphing icons, floating action button, particle effects
 * - Working FontAwesome icons with visual indicators
 * - Glassmorphism with backdrop blur
 * - Active state detection with visual feedback
 * - Badge notifications on primary CTA
 * - Sophisticated micro-interactions
 * - Touch-optimized with haptic-like visual feedback
 * - Full RTL/LTR support with logical properties
 * - SSR compatible
 */

export default function MobileBottomNav() {
  const t = useTranslations('mobileNav');
  const pathname = usePathname();

  // Extract locale from pathname (e.g., /en/... -> 'en', /ar/... -> 'ar')
  const locale = pathname.split('/')[1] || 'en';
  const homeLink = `/${locale}`;
  const doctorLink = `/${locale}/doctors`;
  const bookLink = `/${locale}/booking`;

  // Check if current page matches link (for active state)
  const isHomePage = pathname === `/${locale}` || pathname === `/${locale}/`;
  const isDoctorsPage = pathname.includes('/doctors');
  const isBookingPage = pathname.includes('/booking');

  // Remember the visitor's locale so the (locale-less) PWA offline fallback page
  // can render quick links in the right language.
  useEffect(() => {
    try {
      window.localStorage.setItem('anees-locale', locale === 'ar' ? 'ar' : 'en');
    } catch {
      // Private-mode storage failures are non-fatal.
    }
  }, [locale]);

  return (
    <nav
      className={styles.mobileBottomNav}
      aria-label={t('navLabel')}
      role="navigation"
    >
      {/* Glassmorphism background blur layer */}
      <div className={styles.navBackdrop} aria-hidden="true" />
      
      {/* Animated glow effect */}
      <div className={styles.navGlow} aria-hidden="true" />

      <div className={styles.navContainer}>
        {/* Secondary CTA: Home */}
        <Link
          href={homeLink}
          className={`${styles.navLink} ${isHomePage ? styles.navLinkActive : ''}`}
          aria-label={t('home')}
          aria-current={isHomePage ? 'page' : undefined}
          title={t('home')}
          tabIndex={0}
        >
          {/* Animated background blob */}
          <span className={styles.navBlob} aria-hidden="true" />

          <span className={styles.navIconWrapper} aria-hidden="true">
            {/* FontAwesome home icon */}
            <LucideIcon iconClass="fas fa-house" aria-hidden="true" />

            {/* Animated icon ring */}
            <span className={styles.iconRing} />
          </span>

          <span className={styles.navLabel}>
            {t('home')}
            {/* Active indicator dot */}
            {isHomePage && <span className={styles.activeDot} aria-hidden="true" />}
          </span>
        </Link>

        {/* Primary CTA: Book Now — calm, healthtech-grade primary action */}
        <Link
          href={bookLink}
          className={`${styles.navLink} ${styles.navLinkPrimary} ${isBookingPage ? styles.navLinkActive : ''}`}
          aria-label={t('bookNow')}
          aria-current={isBookingPage ? 'page' : undefined}
          title={t('bookNow')}
          tabIndex={0}
        >
          <span className={styles.navIconWrapper} aria-hidden="true">
            <LucideIcon iconClass="fas fa-calendar-check" aria-hidden="true" />
          </span>

          <span className={styles.navLabel}>
            {t('bookNow')}
          </span>
        </Link>

        <Link
          href={doctorLink}
          className={`${styles.navLink} ${isDoctorsPage ? styles.navLinkActive : ''}`}
          aria-label={t('ourDoctors')}
          aria-current={isDoctorsPage ? 'page' : undefined}
          title={t('ourDoctors')}
          tabIndex={0}
        >
          <span className={styles.navBlob} aria-hidden="true" />

          <span className={styles.navIconWrapper} aria-hidden="true">
            <LucideIcon iconClass="fas fa-user-doctor" aria-hidden="true" />
            <span className={styles.iconRing} />
          </span>

          <span className={styles.navLabel}>
            {t('ourDoctors')}
            {isDoctorsPage && <span className={styles.activeDot} aria-hidden="true" />}
          </span>
        </Link>
      </div>

      {/* Bottom safe area for notched devices */}
      <div className={styles.safeArea} aria-hidden="true" />
    </nav>
  );
}
