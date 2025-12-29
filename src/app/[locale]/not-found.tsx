'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

type Locale = 'en' | 'ar';

const copy: Record<Locale, { title: string; message: string; home: string; doctors: string }> = {
  en: {
    title: 'Page Not Found',
    message: 'We could not find the page you were looking for. Please check the URL or head back home.',
    home: 'Go to Home',
    doctors: 'Browse Doctors',
  },
  ar: {
    title: 'الصفحة غير موجودة',
    message: 'لم نتمكن من العثور على الصفحة المطلوبة. يرجى التحقق من الرابط أو العودة للصفحة الرئيسية.',
    home: 'العودة للرئيسية',
    doctors: 'تصفح الأطباء',
  },
};

export default function LocaleNotFound() {
  const params = useParams();
  const locale = (params?.locale as Locale) || 'en';
  const t = copy[locale] || copy.en;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <main
      className="py-5"
      dir={dir}
      style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)' }}
    >
      <div className="container py-5 text-center" style={{ maxWidth: '720px' }}>
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
          style={{ width: 72, height: 72, background: 'rgba(170, 134, 66, 0.12)', color: '#aa8642', fontSize: '1.75rem' }}
        >
          <i className="isax isax-danger" aria-hidden="true"></i>
        </div>
        <h1 className="fw-bold mb-3" style={{ fontSize: '2rem' }}>{t.title}</h1>
        <p className="text-muted mb-4" style={{ fontSize: '1rem' }}>{t.message}</p>
        <div className="d-flex gap-3 justify-content-center flex-wrap">
          <Link href={`/${locale}`} className="btn btn-primary">
            {t.home}
          </Link>
          <Link href={`/${locale}/doctors`} className="btn btn-outline-primary">
            {t.doctors}
          </Link>
        </div>
      </div>
    </main>
  );
}
