'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './MobileBottomNav.module.scss';
import LucideIcon from '@/components/common/LucideIcon';
import { usePwaManager } from '@/features/pwa/hooks/usePwaManager';

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
function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIphoneIpad = /iphone|ipad|ipod/i.test(ua);
  const isMacWithTouch = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return isIphoneIpad || isMacWithTouch;
}

export default function MobileBottomNav() {
  const t = useTranslations('mobileNav');
  const pathname = usePathname();
  const [isEnablingAlerts, setIsEnablingAlerts] = useState(false);
  const [localStatus, setLocalStatus] = useState('');
  const {
    isSupported,
    isInstalled,
    notificationPermission,
    isSubscribed,
    statusMessage,
    enableNotifications,
  } = usePwaManager();

  // Extract locale from pathname (e.g., /en/... -> 'en', /ar/... -> 'ar')
  const locale = pathname.split('/')[1] || 'en';
  const doctorLink = `/${locale}/doctors`;
  const bookLink = `/${locale}/booking`;

  // Check if current page matches link (for active state)
  const isDoctorsPage = pathname.includes('/doctors');
  const isBookingPage = pathname.includes('/booking');
  const notificationsReady = notificationPermission === 'granted' && isSubscribed;
  const showAlertsAction = !notificationsReady && notificationPermission !== 'denied';
  const displayedStatus = statusMessage || localStatus;

  const onEnableAlerts = async () => {
    setLocalStatus('');

    if (detectIos() && !isInstalled) {
      setLocalStatus(t('alertsInstallFirst'));
      return;
    }

    if (!isSupported) {
      setLocalStatus(t('alertsTryAgain'));
      return;
    }

    setIsEnablingAlerts(true);
    const enabled = await enableNotifications();
    setIsEnablingAlerts(false);
    setLocalStatus(enabled ? t('alertsEnabled') : t('alertsTryAgain'));
  };

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
            <LucideIcon iconClass="fas fa-user-doctor" aria-hidden="true" />
            
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
            <LucideIcon iconClass="fas fa-calendar-check" aria-hidden="true" />
            
            {/* Notification badge */}
            <span className={styles.badge} aria-label={t('bookingAvailable')}>
              <span className={styles.badgePulse} />
            </span>
          </span>
          
          <span className={styles.navLabel}>
            {t('bookNow')}
          </span>
        </Link>

        {showAlertsAction ? (
          <button
            type="button"
            className={`${styles.navLink} ${styles.navButton}`}
            aria-label={t('alerts')}
            title={t('alerts')}
            onClick={onEnableAlerts}
            disabled={isEnablingAlerts}
          >
            <span className={styles.navBlob} aria-hidden="true" />

            <span className={styles.navIconWrapper} aria-hidden="true">
              <LucideIcon iconClass="fas fa-bell" aria-hidden="true" />
              <span className={styles.iconRing} />
            </span>

            <span className={styles.navLabel}>
              {t('alerts')}
            </span>
          </button>
        ) : null}
      </div>

      {displayedStatus && showAlertsAction ? (
        <p className={styles.navStatus} role="status">
          {displayedStatus}
        </p>
      ) : null}

      {/* Bottom safe area for notched devices */}
      <div className={styles.safeArea} aria-hidden="true" />
    </nav>
  );
}
