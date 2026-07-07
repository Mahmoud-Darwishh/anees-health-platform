'use client';

import { useEffect, useState } from 'react';
import LucideIcon from '@/components/common/LucideIcon';
import styles from './OfflineQuickLinks.module.scss';

type OfflineLocale = 'en' | 'ar';

type QuickLink = {
  path: string;
  icon: string;
  label: Record<OfflineLocale, string>;
};

// Only pages that are cached offline (see the NetworkFirst allow-list in
// next.config.ts). Account, payment, and clinical pages are intentionally
// excluded — they stay network-only to protect PHI.
const QUICK_LINKS: QuickLink[] = [
  { path: '', icon: 'fa-house', label: { en: 'Home', ar: 'الرئيسية' } },
  { path: '/doctors', icon: 'fa-user-doctor', label: { en: 'Doctors', ar: 'الأطباء' } },
  { path: '/services', icon: 'fa-heart-pulse', label: { en: 'Services', ar: 'الخدمات' } },
  { path: '/coverage', icon: 'fa-location-dot', label: { en: 'Coverage', ar: 'مناطق التغطية' } },
  { path: '/pricing', icon: 'fa-credit-card', label: { en: 'Pricing', ar: 'الأسعار' } },
  { path: '/about-us', icon: 'fa-circle-info', label: { en: 'About', ar: 'من نحن' } },
  { path: '/contact-us', icon: 'fa-phone', label: { en: 'Contact', ar: 'اتصل بنا' } },
  { path: '/faq', icon: 'fa-circle-question', label: { en: 'FAQ', ar: 'الأسئلة الشائعة' } },
];

const HEADING: Record<OfflineLocale, string> = {
  en: 'Saved pages you can still open',
  ar: 'صفحات محفوظة يمكنك فتحها',
};

function resolveLocale(): OfflineLocale {
  if (typeof window === 'undefined') return 'en';

  try {
    const saved = window.localStorage.getItem('anees-locale');
    if (saved === 'ar' || saved === 'en') return saved;
  } catch {
    // ignore storage errors
  }

  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('ar')
    ? 'ar'
    : 'en';
}

export default function OfflineQuickLinks() {
  // Default to 'en' on first render so server and client markup match, then
  // upgrade to the visitor's real locale after mount.
  const [locale, setLocale] = useState<OfflineLocale>('en');

  useEffect(() => {
    // Defer so the first client render matches the server ('en'), avoiding a
    // hydration mismatch, then upgrade to the visitor's saved locale.
    const timer = window.setTimeout(() => setLocale(resolveLocale()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <nav className={styles.wrap} aria-label={HEADING[locale]} dir={dir}>
      <p className={styles.heading}>{HEADING[locale]}</p>
      <ul className={styles.grid}>
        {QUICK_LINKS.map((link) => (
          <li key={link.path || 'home'}>
            <a href={`/${locale}${link.path}`} className={styles.tile}>
              <span className={styles.tileIcon} aria-hidden="true">
                <LucideIcon iconClass={link.icon} />
              </span>
              <span className={styles.tileLabel}>{link.label[locale]}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
