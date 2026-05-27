'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from './not-found.module.scss';
import LucideIcon from '@/components/common/LucideIcon';

type Locale = 'en' | 'ar';

const copy: Record<
  Locale,
  {
    badge: string;
    code: string;
    title: string;
    message: string;
    home: string;
    booking: string;
    doctors: string;
  }
> = {
  en: {
    badge: '404 Error',
    code: '404',
    title: 'This Page Took A Wrong Turn',
    message: 'The address is no longer available, or it may have moved. Jump back to a trusted page and continue your visit.',
    home: 'Back to Home',
    booking: 'Book a Visit',
    doctors: 'Browse Doctors',
  },
  ar: {
    badge: 'خطأ 404',
    code: '404',
    title: 'هذه الصفحة ليست هنا الآن',
    message: 'قد يكون الرابط تغيّر أو تم نقل الصفحة. يمكنك الرجوع لصفحة آمنة ومتابعة رحلتك بسهولة.',
    home: 'العودة للرئيسية',
    booking: 'حجز زيارة',
    doctors: 'تصفح الأطباء',
  },
};

export default function LocaleNotFound() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const t = copy[locale] || copy.en;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <main className={styles.page} dir={dir}>
      <section className={styles.hero}>
        <div className="container py-5">
          <div className={styles.glow} aria-hidden="true"></div>

          <div className={`mx-auto text-center ${styles.inner}`}>
            <span className={styles.badge}>{t.badge}</span>
            <div
              className={`d-inline-flex align-items-center justify-content-center rounded-circle mt-4 mb-3 ${styles.iconWrapper}`}
            >
              <LucideIcon iconClass="fa-solid fa-circle-exclamation" aria-hidden="true"></LucideIcon>
            </div>

            <p className={styles.code}>{t.code}</p>
            <h1 className={`fw-bold mb-3 ${styles.heading}`}>{t.title}</h1>
            <p className={`mb-4 ${styles.body}`}>{t.message}</p>

            <div className={`d-flex gap-3 justify-content-center flex-wrap ${styles.actions}`}>
              <Link href={`/${locale}`} className="btn btn-primary">
                {t.home}
              </Link>
              <Link href={`/${locale}/booking`} className="btn btn-outline-primary">
                {t.booking}
              </Link>
              <Link href={`/${locale}/doctors`} className="btn btn-outline-secondary">
                {t.doctors}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
