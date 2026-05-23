'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import styles from './services.module.scss';
import type { ContentServiceItem } from '@/lib/api/content-services';
import { STATS } from './constants';

interface ServiceCardProps {
  service: ContentServiceItem;
  isExpanded: boolean;
  onToggle: () => void;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}

function ServiceCard({ service, isExpanded, onToggle, t, locale }: ServiceCardProps) {
  const base = `home.servicesPage.items.${service.code}`;
  const title       = t(`${base}.title`);
  const shortDesc   = t(`${base}.shortDesc`);
  const description = t(`${base}.description`);
  const features    = t.raw(`${base}.features`) as string[];
  const contentId   = `service-content-${service.code}`;

  return (
    <article id={service.code} className={`${styles.serviceCard} ${isExpanded ? styles.expanded : ''}`}>
      <button
        type="button"
        className={styles.serviceToggle}
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        aria-label={title}
      >
        <div className={styles.serviceHeader}>
          <div className={styles.serviceIcon}>
            <i className={service.iconClass} aria-hidden="true"></i>
          </div>
          <div className={styles.serviceInfo}>
            <h3 className={styles.serviceTitle}>{title}</h3>
            <p className={styles.serviceShortDesc}>{shortDesc}</p>
          </div>
          <div className={styles.expandIndicator}>
            <i className="isax isax-arrow-down-1" aria-hidden="true"></i>
          </div>
        </div>
      </button>

      <div className={styles.serviceContent} id={contentId}>
        <p className={styles.serviceDescription}>{description}</p>
        <ul className={styles.featuresList}>
          {features.map((feature: string, index: number) => (
            <li key={index} className={styles.featureItem}>
              {feature}
            </li>
          ))}
        </ul>
        {service.landingSlug ? (
          <div className="mt-3">
            <Link href={`/${locale}/services/${service.landingSlug}`} className="btn btn-outline-primary btn-sm">
              {t('common.view')}
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}

interface ServicesPageContentProps {
  services: ContentServiceItem[];
}

export default function ServicesPageContent({ services }: ServicesPageContentProps) {
  const locale = useLocale();
  const t = useTranslations();
  const [expandedService, setExpandedService] = useState<string | null>(null);

  const toggleService = (code: string) => {
    setExpandedService(expandedService === code ? null : code);
  };

  const breadcrumbItems = [
    { label: locale === 'ar' ? 'الرئيسية' : 'Home', href: `/${locale}` },
    { label: locale === 'ar' ? 'خدماتنا' : 'Our Services', active: true },
  ];

  return (
    <>
      <Header />
      <Breadcrumb items={breadcrumbItems} title={locale === 'ar' ? 'خدماتنا' : 'Our Services'} />

      {/* Intro Section */}
      <section className={styles.introSection} data-reveal>
        <div className="container">
          <div className={styles.introCard}>
            <span className={styles.introEyebrow}>
              {t('home.servicesPage.intro.badge')}
            </span>
            <h1 className={styles.introTitle}>{t('home.servicesPage.categories.title')}</h1>
            <p className={styles.introSubtitle}>{t('home.servicesPage.categories.subtitle')}</p>
            <div className={styles.introDecor} aria-hidden="true">
              <span className={styles.introDot}></span>
              <span className={styles.introDot}></span>
              <span className={styles.introDot}></span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={styles.statsSection} data-reveal>
        <div className="container">
          <div className={styles.statsGrid}>
            {STATS.map((stat) => (
              <div key={stat.labelKey} className={styles.statItem}>
                <div className={styles.statValue}>{stat.value}</div>
                <div className={styles.statLabel}>{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className={styles.servicesSection} data-reveal>
        <div className="container">
          <h2 className={styles.servicesHeading}>{t('home.servicesPage.list.title')}</h2>
          <div className={styles.servicesGrid}>
            {services.map((service) => (
              <ServiceCard
                key={service.code}
                service={service}
                isExpanded={expandedService === service.code}
                onToggle={() => toggleService(service.code)}
                t={t}
                locale={locale}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection} data-reveal>
        <div className="container">
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>{t('home.servicesPage.cta.title')}</h2>
            <p className={styles.ctaDescription}>{t('home.servicesPage.cta.description')}</p>
            <div className={styles.ctaButtons}>
              <Link href={`/${locale}/booking`} className={styles.btnPrimary}>
                {t('home.servicesPage.cta.primaryButton')}
                <i className="isax isax-calendar-1" aria-hidden="true"></i>
              </Link>
              <Link href={`/${locale}/contact`} className={styles.btnSecondary}>
                {t('home.servicesPage.cta.secondaryButton')}
                <i className="isax isax-messages-1" aria-hidden="true"></i>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
