'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './MobileBottomNav.module.scss';

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
  const doctorLink = `/${locale}/doctors`;
  const bookLink = `/${locale}/booking`;

  // Check if current page matches link (for active state)
  const isDoctorsPage = pathname.includes('/doctors');
  const isBookingPage = pathname.includes('/booking');

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
        {/* Secondary CTA: Our Doctors */}
        <Link
          href={doctorLink}
          className={`${styles.navLink} ${isDoctorsPage ? styles.navLinkActive : ''}`}
          aria-label={t('ourDoctors')}
          aria-current={isDoctorsPage ? 'page' : undefined}
          title={t('ourDoctors')}
          tabIndex={0}
        >
          {/* Animated background blob */}
          <span className={styles.navBlob} aria-hidden="true" />
          
          <span className={styles.navIconWrapper} aria-hidden="true">
            {/* FontAwesome stethoscope icon */}
            <i className="fas fa-user-doctor" />
            
            {/* Animated icon ring */}
            <span className={styles.iconRing} />
          </span>
          
          <span className={styles.navLabel}>
            {t('ourDoctors')}
            {/* Active indicator dot */}
            {isDoctorsPage && <span className={styles.activeDot} aria-hidden="true" />}
          </span>
        </Link>

        {/* Primary CTA: Book Now - Floating Action Button Style */}
        <Link
          href={bookLink}
          className={`${styles.navLink} ${styles.navLinkPrimary} ${isBookingPage ? styles.navLinkActive : ''}`}
          aria-label={t('bookNow')}
          aria-current={isBookingPage ? 'page' : undefined}
          title={t('bookNow')}
          tabIndex={0}
        >
          {/* Floating action button glow */}
          <span className={styles.fabGlow} aria-hidden="true" />
          
          {/* Particle effects container */}
          <span className={styles.particles} aria-hidden="true">
            <span className={styles.particle} />
            <span className={styles.particle} />
            <span className={styles.particle} />
          </span>
          
          <span className={styles.navIconWrapper} aria-hidden="true">
            {/* FontAwesome calendar icon */}
            <i className="fas fa-calendar-check" />
            
            {/* Notification badge */}
            <span className={styles.badge} aria-label="New booking available">
              <span className={styles.badgePulse} />
            </span>
          </span>
          
          <span className={styles.navLabel}>
            {t('bookNow')}
          </span>
        </Link>
      </div>

      {/* Bottom safe area for notched devices */}
      <div className={styles.safeArea} aria-hidden="true" />
    </nav>
  );
}
