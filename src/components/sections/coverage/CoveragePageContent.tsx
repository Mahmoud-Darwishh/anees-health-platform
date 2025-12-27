'use client';

import React, { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useReveal } from '@/hooks/useReveal';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Breadcrumb from '@/components/layout/Breadcrumb';
import CoverageCheckForm from '@/components/client/CoverageCheckForm';

interface CoveragePageContentProps {
  locale: string;
}

export default function CoveragePageContent({ locale }: CoveragePageContentProps) {
  const t = useTranslations('coveragePage');
  const pathname = usePathname();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useReveal(wrapperRef, [pathname, locale]);

  const breadcrumbItems = [
    { label: t('breadcrumb.home'), href: `/${locale}` },
    { label: t('breadcrumb.coverage'), active: true },
  ];

  return (
    <div ref={wrapperRef} className="main-wrapper" key={locale}>
      <Header />

      <Breadcrumb items={breadcrumbItems} title={t('title')} />

      <section className="coverage-check-section pb-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="coverage-check-card card shadow-sm border-0" data-reveal>
                <div className="card-body p-4 p-md-5">
                  <CoverageCheckForm locale={locale} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works-section pt-5 pb-4 bg-light">
        <div className="container">
          <div className="row justify-content-center mb-5">
            <div className="col-lg-8 text-center" data-reveal>
              <h2 className="section-title mb-3">{t('how_it_works_title')}</h2>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-md-4" data-reveal>
              <div className="how-step text-center">
                <div className="step-icon mb-3">
                  <div className="icon-circle bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center"
                       style={{ width: '80px', height: '80px' }}>
                    <i className="fas fa-map-location-dot fs-2" aria-hidden="true"></i>
                  </div>
                </div>
                <h3 className="step-title h5 mb-3">{t('how_step_1_title')}</h3>
                <p className="text-muted">{t('how_step_1_text')}</p>
              </div>
            </div>

            <div className="col-md-4" data-reveal>
              <div className="how-step text-center">
                <div className="step-icon mb-3">
                  <div className="icon-circle bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center"
                       style={{ width: '80px', height: '80px' }}>
                    <i className="fas fa-keyboard fs-2" aria-hidden="true"></i>
                  </div>
                </div>
                <h3 className="step-title h5 mb-3">{t('how_step_2_title')}</h3>
                <p className="text-muted">{t('how_step_2_text')}</p>
              </div>
            </div>

            <div className="col-md-4" data-reveal>
              <div className="how-step text-center">
                <div className="step-icon mb-3">
                  <div className="icon-circle bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center"
                       style={{ width: '80px', height: '80px' }}>
                    <i className="fas fa-check-circle fs-2" aria-hidden="true"></i>
                  </div>
                </div>
                <h3 className="step-title h5 mb-3">{t('how_step_3_title')}</h3>
                <p className="text-muted">{t('how_step_3_text')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
