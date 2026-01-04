'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

const SectionPackages: React.FC = () => {
  const t = useTranslations('home.packages');
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const packageIds = ['haraka', 'wai', 'amal'] as const;
  const packageThemes = { haraka: 'package-light', wai: 'package-dark', amal: 'package-light' };

  return (
    <section className="packages-section">
      <div className="container">
        <div
          className="section-header sec-header-one text-center aos"
          data-reveal
        >
          <span className="badge badge-primary">{t('badge')}</span>
          <h2>{t('title')}</h2>
          <p className="section-subtitle">{t('subtitle')}</p>
        </div>
        
        <div className="row g-4">
          {packageIds.map((packageId) => {
            const pkg = t.raw(packageId);
            const className = packageThemes[packageId];
            
            return (
              <div key={packageId} className="col-lg-4 col-md-6">
                <div className={`package-card ${className} aos`} data-reveal>
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
                      href={`/${locale}/booking?package=${packageId}`}
                      className="btn btn-package"
                      aria-label={`${t('book_now')} ${pkg.nameEn} ${pkg.nameAr}`}
                    >
                      {t('book_now')}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center package-cta aos" data-reveal>
          <p className="package-note">{t('contact_note')}</p>
          <Link
            href={`/${locale}/contact`}
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
