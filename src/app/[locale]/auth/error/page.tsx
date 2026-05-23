import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import styles from '../auth.module.scss';

type Props = { params: Promise<{ locale: string }> };

export const metadata = { robots: { index: false } };

export default async function AuthErrorPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.error' });

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Image src="/assets/img/footer-logo.png" alt="Anees Health" width={140} height={48} />
        </div>
        <div className={styles.heading}>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
          <Link href={`/${locale}/auth/login`} className={styles.submitBtn} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            {t('tryAgain')}
          </Link>
          <Link href={`/${locale}`} className={styles.footer} style={{ display: 'block', textAlign: 'center' }}>
            {t('home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
