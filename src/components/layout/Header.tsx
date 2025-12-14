'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function Header() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en';
    const path = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(path);
  };

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo">
            <Link href={`/${locale}`}>
              <h1>Anees Health</h1>
            </Link>
          </div>
          
          <nav className="nav">
            <ul className="nav-list">
              <li>
                <Link href={`/${locale}`}>{t('home')}</Link>
              </li>
              <li>
                <Link href={`/${locale}/about`}>{t('about')}</Link>
              </li>
              <li>
                <Link href={`/${locale}/services`}>{t('services')}</Link>
              </li>
              <li>
                <Link href={`/${locale}/doctors`}>{t('doctors')}</Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`}>{t('contact')}</Link>
              </li>
            </ul>
          </nav>

          <button 
            onClick={switchLanguage}
            className="language-switcher"
            aria-label="Switch Language"
          >
            {locale === 'en' ? 'العربية' : 'English'}
          </button>
        </div>
      </div>
    </header>
  );
}
